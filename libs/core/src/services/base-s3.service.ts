import * as fs from "fs";
import * as path from "path";

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { Logger } from "@nestjs/common";
import { LRUCache } from "lru-cache";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface BufferUploadData {
  room: string;
  recordId: number;
  deviceId?: string;
  url?: string;
  userAgent?: string;
  title?: string;
  bufferData: Array<{
    method: string;
    params: unknown;
    timestamp: number;
  }>;
  timestamp: number;
  date?: string;
  sessionStartTime?: number;
  /** Allow additional properties from S3/JSON sources. */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Cache constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60 * 1000;
const MAX_LIST_CACHE_SIZE = 200;
const MAX_OBJECT_CACHE_SIZE = 1000;
const MAX_S3_RESULTS = 200;

/** S3 호환 환경 목록 */
const S3_ENABLED_ENVS = new Set(["beta", "production", "prod"]);

// ---------------------------------------------------------------------------
// BaseS3Service -- 외부/내부 S3 서비스의 공통 기반
// ---------------------------------------------------------------------------

/**
 * S3 백업 서비스의 공통 기능을 제공하는 추상 베이스 클래스.
 *
 * 캐싱, 메타데이터 정리, S3/로컬 파일 저장, 날짜 후보 생성 등
 * 외부/내부 서비스에서 중복되는 로직을 통합한다.
 */
export abstract class BaseS3Service {
  protected abstract readonly logger: Logger;
  protected readonly backupDir = path.join(process.cwd(), "backups");
  protected readonly s3Client: S3Client;

  protected readonly runtimeEnv = (
    process.env.APP_ENV ||
    process.env.NODE_ENV ||
    "development"
  )
    .trim()
    .toLowerCase();

  protected readonly isRemoteStorageEnabled = S3_ENABLED_ENVS.has(
    this.runtimeEnv,
  );

  // -------------------------------------------------------------------------
  // Cache infrastructure (LRU with TTL)
  // -------------------------------------------------------------------------

  protected readonly listCache = new LRUCache<string, BufferUploadData[]>({
    max: MAX_LIST_CACHE_SIZE,
    ttl: CACHE_TTL_MS,
  });
  protected readonly objectCache = new LRUCache<string, BufferUploadData>({
    max: MAX_OBJECT_CACHE_SIZE,
    ttl: CACHE_TTL_MS,
  });
  protected readonly listInFlight = new Map<
    string,
    Promise<BufferUploadData[]>
  >();
  protected readonly objectInFlight = new Map<
    string,
    Promise<BufferUploadData | null>
  >();

  constructor() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "ap-northeast-2",
    });
  }

  protected logInit(): void {
    this.logger.log(
      `[S3_INIT] Environment detection: APP_ENV=${process.env.APP_ENV}, NODE_ENV=${process.env.NODE_ENV}, ` +
        `resolved=${this.runtimeEnv}, toS3=${this.isRemoteStorageEnabled}`,
    );
  }

  // -------------------------------------------------------------------------
  // Metadata sanitization
  // -------------------------------------------------------------------------

  protected sanitizeMetadata(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const sanitized = value
      .replace(/[\r\n]+/g, " ")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/[\u0080-\uFFFF]/g, "")
      .trim();

    if (!sanitized) {
      return undefined;
    }

    return sanitized.slice(0, 1024);
  }

  // -------------------------------------------------------------------------
  // Cache key builders
  // -------------------------------------------------------------------------

  protected buildListCacheKey(deviceId: string, targetDate?: string): string {
    return `${deviceId || "ALL"}|${targetDate || "ALL"}`;
  }

  protected buildObjectCacheKey(deviceId: string, timestamp: number): string {
    return `${deviceId || "unknown-device"}|${timestamp}`;
  }

  // -------------------------------------------------------------------------
  // Data cloning (defensive copies via structuredClone)
  // -------------------------------------------------------------------------

  protected cloneBufferData(data: BufferUploadData): BufferUploadData {
    return structuredClone(data);
  }

  protected cloneBufferDataArray(list: BufferUploadData[]): BufferUploadData[] {
    return structuredClone(list);
  }

  // -------------------------------------------------------------------------
  // List cache (delegates to LRU)
  // -------------------------------------------------------------------------

  protected getCachedList(key: string): BufferUploadData[] | null {
    const data = this.listCache.get(key);
    return data ? this.cloneBufferDataArray(data) : null;
  }

  protected setCachedList(key: string, data: BufferUploadData[]): void {
    this.listCache.set(key, this.cloneBufferDataArray(data));
  }

  // -------------------------------------------------------------------------
  // Object cache (delegates to LRU)
  // -------------------------------------------------------------------------

  protected getCachedObject(key: string): BufferUploadData | null {
    const data = this.objectCache.get(key);
    return data ? this.cloneBufferData(data) : null;
  }

  protected setCachedObject(key: string, data: BufferUploadData): void {
    this.objectCache.set(key, this.cloneBufferData(data));
  }

  // -------------------------------------------------------------------------
  // S3 cloud operations
  // -------------------------------------------------------------------------

  /**
   * S3에서 백업 데이터를 조회한다.
   */
  protected async getS3BackupFromCloud(
    deviceId: string,
    targetDate?: string,
  ): Promise<BufferUploadData[]> {
    try {
      const bucketName = process.env.AWS_S3_BUCKET || "remote-debug-tools-s3";
      const results: BufferUploadData[] = [];

      const searchDates = this.buildSearchDates(targetDate);

      for (const searchDate of searchDates) {
        const prefix = deviceId
          ? `backups/${searchDate}/${deviceId}/`
          : `backups/${searchDate}/`;

        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          MaxKeys: MAX_S3_RESULTS,
        });

        const listResponse = await this.s3Client.send(listCommand);
        if (!listResponse.Contents) continue;

        for (const obj of listResponse.Contents) {
          if (!obj.Key) continue;

          try {
            const getCommand = new GetObjectCommand({
              Bucket: bucketName,
              Key: obj.Key,
            });

            const getResponse = await this.s3Client.send(getCommand);

            if (getResponse.Body) {
              const bodyString = await getResponse.Body.transformToString();
              const data = JSON.parse(bodyString) as BufferUploadData;

              if (!deviceId || data.deviceId === deviceId) {
                results.push(data);
                this.setCachedObject(
                  this.buildObjectCacheKey(
                    data.deviceId || deviceId,
                    data.timestamp,
                  ),
                  data,
                );
              }
            }
          } catch (parseError) {
            this.logger.warn(
              `[S3_CLOUD_QUERY] Failed to parse object ${obj.Key}: ${parseError}`,
            );
          }

          if (results.length >= MAX_S3_RESULTS) break;
        }

        if (results.length >= MAX_S3_RESULTS) break;
      }

      results.sort((a, b) => b.timestamp - a.timestamp);
      return results;
    } catch (error) {
      this.logger.error(`[S3_CLOUD_QUERY_ERROR] Failed to query S3: ${error}`);
      return [];
    }
  }

  /**
   * S3에 데이터를 직접 업로드한다.
   */
  protected async uploadToS3(data: BufferUploadData): Promise<string> {
    try {
      const { deviceId, timestamp, date } = data;
      const targetDate =
        date ||
        new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
      const fileName = `session_${timestamp}.json`;
      const s3Key = `backups/${targetDate}/${deviceId || "unknown-device"}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || "remote-debug-tools-s3",
        Key: s3Key,
        Body: JSON.stringify(data, null, 2),
        ContentType: "application/json",
        Metadata: ((sanitizedTitle) => ({
          deviceId: deviceId || "unknown-device",
          url: data.url || "",
          timestamp: timestamp.toString(),
          ...(sanitizedTitle ? { title: sanitizedTitle } : {}),
        }))(this.sanitizeMetadata(data.title)),
      });

      await this.s3Client.send(command);
      return s3Key;
    } catch (error) {
      this.logger.error(`[S3_UPLOAD_ERROR] Failed to upload to S3: ${error}`);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Lookup by device + timestamp
  // -------------------------------------------------------------------------

  /**
   * 디바이스 ID와 타임스탬프로 특정 백업을 조회한다.
   */
  public async getBackupByDeviceAndTimestamp(
    deviceId: string,
    timestamp: number,
    dateHint?: string,
  ): Promise<BufferUploadData | null> {
    if (!deviceId || !Number.isFinite(timestamp)) {
      return null;
    }

    const candidateDates = this.buildCandidateDates(timestamp, dateHint);
    if (candidateDates.length === 0) {
      return null;
    }

    const cacheKey = this.buildObjectCacheKey(deviceId, timestamp);
    const cached = this.getCachedObject(cacheKey);
    if (cached) {
      return cached;
    }

    const pending = this.objectInFlight.get(cacheKey);
    if (pending) {
      const result = await pending;
      return result ? this.cloneBufferData(result) : null;
    }

    const fileName = `session_${timestamp}.json`;

    const fetchPromise = (async (): Promise<BufferUploadData | null> => {
      if (this.isRemoteStorageEnabled) {
        const bucketName = process.env.AWS_S3_BUCKET || "remote-debug-tools-s3";

        for (const date of candidateDates) {
          const key = `backups/${date}/${deviceId}/${fileName}`;
          try {
            const command = new GetObjectCommand({
              Bucket: bucketName,
              Key: key,
            });
            const response = await this.s3Client.send(command);
            if (response.Body) {
              const bodyString = await response.Body.transformToString();
              return JSON.parse(bodyString) as BufferUploadData;
            }
          } catch (error: unknown) {
            const s3Err = error as {
              $metadata?: { httpStatusCode?: number };
              name?: string;
              message?: string;
            };
            const statusCode = s3Err?.$metadata?.httpStatusCode;
            if (statusCode === 404 || s3Err?.name === "NoSuchKey") {
              continue;
            }
            this.logger.warn(
              `[S3_LOOKUP_WARN] Failed to fetch ${key}: ${s3Err?.message || error}`,
            );
          }
        }
      } else {
        for (const date of candidateDates) {
          const filePath = path.join(this.backupDir, date, deviceId, fileName);
          if (!fs.existsSync(filePath)) {
            continue;
          }

          try {
            const content = await fs.promises.readFile(filePath, "utf-8");
            return JSON.parse(content) as BufferUploadData;
          } catch (error) {
            this.logger.warn(
              `[LOCAL_LOOKUP_WARN] Failed to read ${filePath}: ${error instanceof Error ? error.message : error}`,
            );
          }
        }
      }

      return null;
    })();

    this.objectInFlight.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      if (result) {
        this.setCachedObject(cacheKey, result);
        return this.cloneBufferData(result);
      }
      return null;
    } finally {
      this.objectInFlight.delete(cacheKey);
    }
  }

  // -------------------------------------------------------------------------
  // Local file operations
  // -------------------------------------------------------------------------

  /**
   * 로컬 파일로 데이터를 저장한다.
   */
  protected async saveToLocalFile(data: BufferUploadData): Promise<string> {
    const deviceId = data.deviceId || "unknown-device";
    const sessionStartTime =
      data.sessionStartTime || data.timestamp || Date.now();

    const koreanTime = new Date(sessionStartTime + 9 * 60 * 60 * 1000);
    const recordDate = koreanTime.toISOString().split("T")[0];

    const fileName = `session_${sessionStartTime}.json`;
    const deviceDir = path.join(this.backupDir, recordDate, deviceId);
    const filePath = path.join(deviceDir, fileName);

    await fs.promises.mkdir(deviceDir, { recursive: true });

    const sessionData = {
      room: data.room,
      recordId: data.recordId,
      deviceId: data.deviceId,
      url: data.url,
      userAgent: data.userAgent,
      title: data.title,
      sessionStartTime,
      date: recordDate,
      bufferData: data.bufferData,
    };

    await fs.promises.writeFile(filePath, JSON.stringify(sessionData, null, 2));

    this.logger.log(
      `[LOCAL_SAVE_SUCCESS] ${JSON.stringify({
        deviceId,
        filePath,
        eventCount: data.bufferData.length,
      })}`,
    );

    return filePath;
  }

  // -------------------------------------------------------------------------
  // Date helpers
  // -------------------------------------------------------------------------

  /**
   * 조회할 날짜 후보 목록을 생성한다 (KST 기준).
   */
  protected buildSearchDates(targetDate?: string): string[] {
    if (targetDate) {
      const baseDate = new Date(targetDate);
      const dates: string[] = [];
      for (let i = -1; i <= 0; i++) {
        const checkDate = new Date(baseDate);
        checkDate.setDate(baseDate.getDate() + i);
        dates.push(checkDate.toISOString().split("T")[0]);
      }
      return dates;
    }

    const dates: string[] = [];
    for (let i = 0; i < 2; i++) {
      const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  }

  /**
   * 타임스탬프와 날짜 힌트로 후보 날짜를 생성한다.
   */
  protected buildCandidateDates(
    timestamp: number,
    dateHint?: string,
  ): string[] {
    const candidates = new Set<string>();

    if (dateHint) {
      candidates.add(dateHint);
    }

    if (Number.isFinite(timestamp)) {
      const utcDate = new Date(timestamp).toISOString().split("T")[0];
      candidates.add(utcDate);

      const kstDate = new Date(timestamp + 9 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      candidates.add(kstDate);
    }

    return Array.from(candidates);
  }

  // -------------------------------------------------------------------------
  // Local file listing
  // -------------------------------------------------------------------------

  /**
   * 로컬 백업 디렉토리에서 모든 세션 파일을 조회한다.
   */
  protected async listLocalBackupFiles(
    deviceId?: string,
    targetDate?: string,
  ): Promise<BufferUploadData[]> {
    try {
      const results: BufferUploadData[] = [];

      const dateDirs = targetDate
        ? [targetDate]
        : await this.listDirectoryEntries(this.backupDir);

      for (const dateDir of dateDirs) {
        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.existsSync(datePath)) continue;

        const deviceDirs = deviceId
          ? [deviceId]
          : await this.listDirectoryEntries(datePath);

        for (const devDir of deviceDirs) {
          const devicePath = path.join(datePath, devDir);
          if (!fs.existsSync(devicePath)) continue;

          const files = await this.listDirectoryEntries(devicePath);
          for (const file of files) {
            if (!file.endsWith(".json")) continue;

            try {
              const content = await fs.promises.readFile(
                path.join(devicePath, file),
                "utf-8",
              );
              const data = JSON.parse(content) as BufferUploadData;
              results.push(data);
            } catch {
              // Skip malformed files
            }
          }
        }
      }

      results.sort((a, b) => b.timestamp - a.timestamp);
      return results;
    } catch (error) {
      this.logger.error(
        `[LOCAL_LIST_ERROR] Failed to list local files: ${error}`,
      );
      return [];
    }
  }

  private async listDirectoryEntries(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(dirPath);
      return entries.filter((e) => !e.startsWith("."));
    } catch {
      return [];
    }
  }
}
