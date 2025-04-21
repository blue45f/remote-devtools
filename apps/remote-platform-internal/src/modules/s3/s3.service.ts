import * as fs from "fs";
import * as path from "path";

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";

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
  date?: string; // 날짜 정보 추가 (YYYY-MM-DD)
  sessionStartTime?: number; // 세션 시작 시간
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly backupDir = path.join(process.cwd(), "backups");
  private readonly s3Client: S3Client;
  private readonly runtimeEnv = (
    process.env.APP_ENV ||
    process.env.NODE_ENV ||
    "development"
  )
    .trim()
    .toLowerCase();
  private readonly saveToS3Envs = new Set(["beta", "production", "prod"]);
  private readonly isRemoteStorageEnabled = this.saveToS3Envs.has(
    this.runtimeEnv,
  );

  private readonly CACHE_TTL_MS = 60 * 1000; // 60초 TTL
  private readonly MAX_LIST_CACHE_SIZE = 200;
  private readonly MAX_OBJECT_CACHE_SIZE = 1000;

  private readonly listCache = new Map<
    string,
    { data: BufferUploadData[]; expiresAt: number }
  >();
  private readonly objectCache = new Map<
    string,
    { data: BufferUploadData; expiresAt: number }
  >();
  private readonly listInFlight = new Map<
    string,
    Promise<BufferUploadData[]>
  >();
  private readonly objectInFlight = new Map<
    string,
    Promise<BufferUploadData | null>
  >();

  // S3 백업 재생 전용 캐시 (선택된 파일 경로들 기준)
  private s3PlaybackCache = new Map<string, BufferUploadData[]>();
  private maxS3CacheSize = 500; // 최대 500개 파일 경로 조합 캐싱

  private sanitizeMetadata(value: string | undefined): string | undefined {
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

  constructor() {
    // 백업 디렉토리 확인
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    this.logger.log(
      `[S3_INIT] Environment detection: APP_ENV=${process.env.APP_ENV}, NODE_ENV=${process.env.NODE_ENV}, ` +
        `resolved=${this.runtimeEnv}, toS3=${this.isRemoteStorageEnabled}`,
    );

    // S3 클라이언트 초기화 (EC2 IAM Role 자동 인증)
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "ap-northeast-2", // 서울 리전
      // EC2 IAM Role 사용 시 credentials 자동 설정 (별도 설정 불필요)
    });
  }

  private buildListCacheKey(deviceId: string, targetDate?: string): string {
    return `${deviceId || "ALL"}|${targetDate || "ALL"}`;
  }

  private buildObjectCacheKey(deviceId: string, timestamp: number): string {
    return `${deviceId || "unknown-device"}|${timestamp}`;
  }

  private cloneBufferData(data: BufferUploadData): BufferUploadData {
    return {
      ...data,
      bufferData: Array.isArray(data.bufferData)
        ? data.bufferData.map((event) => ({ ...event }))
        : [],
    };
  }

  private cloneBufferDataArray(list: BufferUploadData[]): BufferUploadData[] {
    return list.map((item) => this.cloneBufferData(item));
  }

  private getCachedList(key: string): BufferUploadData[] | null {
    const entry = this.listCache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.listCache.delete(key);
      return null;
    }

    return this.cloneBufferDataArray(entry.data);
  }

  private setCachedList(key: string, data: BufferUploadData[]): void {
    if (this.MAX_LIST_CACHE_SIZE <= 0) return;
    if (
      !this.listCache.has(key) &&
      this.listCache.size >= this.MAX_LIST_CACHE_SIZE
    ) {
      const oldestKey = this.listCache.keys().next().value;
      this.listCache.delete(oldestKey);
    }
    this.listCache.set(key, {
      data: this.cloneBufferDataArray(data),
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  private getCachedObject(key: string): BufferUploadData | null {
    const entry = this.objectCache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.objectCache.delete(key);
      return null;
    }
    return this.cloneBufferData(entry.data);
  }

  private setCachedObject(key: string, data: BufferUploadData): void {
    if (this.MAX_OBJECT_CACHE_SIZE <= 0) return;
    if (
      !this.objectCache.has(key) &&
      this.objectCache.size >= this.MAX_OBJECT_CACHE_SIZE
    ) {
      const oldestKey = this.objectCache.keys().next().value;
      this.objectCache.delete(oldestKey);
    }
    this.objectCache.set(key, {
      data: this.cloneBufferData(data),
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  /**
   * 환경에 따른 데이터 저장 (beta: S3, dev: 로컬 파일)
   */
  public async saveBufferData(data: BufferUploadData): Promise<void> {
    try {
      if (this.isRemoteStorageEnabled) {
        // Beta 환경: S3 업로드
        await this.uploadToS3(data);
      } else {
        // 개발 환경: 로컬 파일 저장
        await this.saveToLocalFile(data);
        this.logger.log(`[DEV_MODE] Local file save mode`);
      }
    } catch (error) {
      this.logger.error(`[SAVE_BUFFER_ERROR] ${error}`);
      throw error;
    }
  }

  /**
   * S3에서 백업 데이터 조회 (beta 환경에서)
   */
  public async getS3BackupData(
    deviceId: string,
    beforeTimestamp?: number,
    targetDate?: string,
  ): Promise<BufferUploadData[]> {
    if (this.isRemoteStorageEnabled) {
      // Beta 환경: S3에서 조회
      this.logger.log(
        `[S3_QUERY] Querying S3 for deviceId: ${deviceId}, beforeTimestamp: ${beforeTimestamp}, targetDate: ${targetDate}`,
      );

      const cacheKey = this.buildListCacheKey(deviceId, targetDate);
      let records = this.getCachedList(cacheKey);

      if (!records) {
        const inFlight = await this.listInFlight.get(cacheKey);
        if (inFlight) {
          records = this.cloneBufferDataArray(await inFlight);
        } else {
          const fetchPromise = this.getS3BackupFromCloud(deviceId, targetDate);
          this.listInFlight.set(cacheKey, fetchPromise);
          try {
            const fetched = await fetchPromise;
            this.setCachedList(cacheKey, fetched);
            records = this.cloneBufferDataArray(fetched);
          } finally {
            this.listInFlight.delete(cacheKey);
          }
        }
      }

      if (!records) {
        return [];
      }

      if (beforeTimestamp) {
        const filteredRecords = records.filter(
          (record) => record.timestamp < beforeTimestamp,
        );
        this.logger.log(
          `[S3_QUERY] Filtered ${records.length} → ${filteredRecords.length} records before timestamp ${beforeTimestamp}`,
        );
        return filteredRecords;
      }

      return records;
    } else {
      // 개발 환경: 로컬 파일에서 조회
      if (!deviceId) {
        return this.getBufferData("", undefined);
      }
      return this.getBufferDataByDeviceId(deviceId);
    }
  }

  /**
   * 실제 S3에서 백업 데이터 조회
   */
  private async getS3BackupFromCloud(
    deviceId: string,
    targetDate?: string,
  ): Promise<BufferUploadData[]> {
    try {
      const bucketName = process.env.AWS_S3_BUCKET || "remote-debug-tools-s3";
      const searchDates: string[] = [];

      if (targetDate) {
        const baseDate = new Date(targetDate);
        for (let i = -1; i <= 0; i++) {
          const checkDate = new Date(baseDate);
          checkDate.setDate(baseDate.getDate() + i);
          searchDates.push(checkDate.toISOString().split("T")[0]);
        }
      } else {
        for (let i = 0; i < 2; i++) {
          const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
          date.setDate(date.getDate() - i);
          searchDates.push(date.toISOString().split("T")[0]);
        }
      }

      const results: BufferUploadData[] = [];
      const MAX_RESULTS = Math.min(
        200,
        Number(process.env.S3_PREVIOUS_LIMIT) || 10,
      );

      const objectEntries: Array<{
        key: string;
        sessionStartTime: number;
        deviceId: string;
        date: string;
      }> = [];

      for (const searchDate of searchDates) {
        const prefix = deviceId
          ? `backups/${searchDate}/${deviceId}/`
          : `backups/${searchDate}/`;

        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          MaxKeys: 500,
        });

        const listResponse = await this.s3Client.send(listCommand);
        if (!listResponse.Contents) {
          continue;
        }

        for (const obj of listResponse.Contents) {
          if (!obj.Key) continue;

          const match = obj.Key.match(
            /^(?:backups\/)?(\d{4}-\d{2}-\d{2})\/([^/]+)\/session_(\d+)\.json$/,
          );
          if (!match) {
            continue;
          }

          const [, objDate, objDeviceId, sessionTs] = match;
          if (deviceId && objDeviceId !== deviceId) {
            continue;
          }

          const sessionStartTime = Number(sessionTs);
          if (!Number.isFinite(sessionStartTime)) {
            continue;
          }

          objectEntries.push({
            key: obj.Key,
            sessionStartTime,
            deviceId: objDeviceId,
            date: objDate,
          });
        }
      }

      if (objectEntries.length === 0) {
        return [];
      }

      objectEntries.sort((a, b) => b.sessionStartTime - a.sessionStartTime);

      const selectedEntries = objectEntries.slice(0, MAX_RESULTS);

      for (const entry of selectedEntries) {
        try {
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: entry.key,
          });
          const getResponse = await this.s3Client.send(getCommand);

          if (!getResponse.Body) {
            continue;
          }

          const bodyString = await getResponse.Body.transformToString();
          const data = JSON.parse(bodyString) as BufferUploadData;

          data.sessionStartTime = entry.sessionStartTime;
          data.timestamp = entry.sessionStartTime;
          data.deviceId = data.deviceId || entry.deviceId;
          data.date = data.date || entry.date;

          results.push(data);
          this.setCachedObject(
            this.buildObjectCacheKey(
              data.deviceId || entry.deviceId,
              data.timestamp,
            ),
            data,
          );
        } catch (parseError) {
          this.logger.warn(
            `[S3_CLOUD_QUERY] Failed to parse object ${entry.key}: ${parseError}`,
          );
        }
      }

      results.sort((a, b) => {
        const aTime = a.sessionStartTime ?? a.timestamp ?? 0;
        const bTime = b.sessionStartTime ?? b.timestamp ?? 0;
        return bTime - aTime;
      });
      return results;
    } catch (error) {
      this.logger.error(
        `[S3_ERROR] Failed to query S3: ${error?.message || error}`,
      );
      return [];
    }
  }

  /**
   * 로컬 파일 저장
   */
  private async saveToLocalFile(data: BufferUploadData): Promise<void> {
    const date = new Date(data.timestamp).toISOString().split("T")[0];
    const deviceId = data.deviceId || "unknown-device";
    const fileName = `session_${data.timestamp}.json`;

    const dirPath = path.join(this.backupDir, date, deviceId);
    const filePath = path.join(dirPath, fileName);

    // 디렉토리 생성
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 파일 저장
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    this.logger.log(`[LOCAL_SAVED] ${filePath}`);
  }

  /**
   * S3 업로드
   */
  private async uploadToS3(data: BufferUploadData): Promise<void> {
    const date = new Date(data.timestamp).toISOString().split("T")[0];
    const deviceId = data.deviceId || "unknown-device";
    const fileName = `session_${data.timestamp}.json`;
    const s3Key = `backups/${date}/${deviceId}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || "remote-debug-tools-s3",
      Key: s3Key,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
      Metadata: ((sanitizedTitle) => ({
        deviceId: deviceId,
        url: data.url || "",
        timestamp: data.timestamp.toString(),
        ...(sanitizedTitle ? { title: sanitizedTitle } : {}),
      }))(this.sanitizeMetadata(data.title)),
    });

    await this.s3Client.send(command);
    this.logger.log(
      `[S3_UPLOADED] s3://${process.env.AWS_S3_BUCKET || "remote-debug-tools-s3"}/${s3Key}`,
    );
    this.logger.log(
      `[S3_UPLOAD_SUCCESS] deviceId: ${deviceId}, events: ${data.bufferData?.length || 0}`,
    );
  }

  private buildCandidateDates(timestamp: number, dateHint?: string): string[] {
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

    const fileName = `session_${timestamp}.json`;
    const cacheKey = this.buildObjectCacheKey(deviceId, timestamp);

    const cached = this.getCachedObject(cacheKey);
    if (cached) {
      return cached;
    }

    const pending = await this.objectInFlight.get(cacheKey);
    if (pending) {
      const result = pending;
      return result ? this.cloneBufferData(result) : null;
    }

    const fetchPromise = (async () => {
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
              const parsed = JSON.parse(bodyString) as BufferUploadData;
              return parsed;
            }
          } catch (error: any) {
            const statusCode = error?.$metadata?.httpStatusCode;
            if (statusCode === 404 || error?.name === "NoSuchKey") {
              continue;
            }
            this.logger.warn(
              `[S3_LOOKUP_WARN] Failed to fetch ${key}: ${error?.message || error}`,
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
            const parsed = JSON.parse(content) as BufferUploadData;
            return parsed;
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

  /**
   * deviceId 기반 백업 데이터 조회 (새 구조 전용)
   */
  public async getBufferDataByDeviceId(
    deviceId: string,
    room?: string,
    recordId?: number,
  ): Promise<BufferUploadData[]> {
    try {
      const results: BufferUploadData[] = [];

      // 1. 새 구조에서 검색: date/deviceId/session_timestamp.json
      if (!fs.existsSync(this.backupDir)) {
        return results;
      }

      const allItems = await fs.promises.readdir(this.backupDir);
      const dateDirs = allItems
        .filter((dir) => /^\d{4}-\d{2}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a));

      for (const dateDir of dateDirs) {
        const devicePath = path.join(this.backupDir, dateDir, deviceId);
        if (!fs.existsSync(devicePath)) continue;

        const files = await fs.promises.readdir(devicePath);

        for (const file of files) {
          if (file.endsWith(".json")) {
            const fileMatch = file.match(/session_(\d+)\.json/);
            if (!fileMatch) continue;

            const filePath = path.join(devicePath, file);
            try {
              const content = await fs.promises.readFile(filePath, "utf-8");
              const rawData = JSON.parse(content);

              // 새로운 구조인지 확인 (bufferChunks가 있는 경우)
              if (rawData.bufferChunks) {
                // 새 구조를 기존 구조로 변환
                const convertedData: BufferUploadData = {
                  room: rawData.room,
                  recordId: rawData.recordId,
                  deviceId: rawData.deviceId,
                  url: rawData.url,
                  userAgent: rawData.userAgent,
                  timestamp: rawData.sessionStartTime || rawData.timestamp,
                  bufferData: [],
                };

                // 모든 chunk의 이벤트를 하나의 배열로 합치기
                for (const chunk of rawData.bufferChunks) {
                  if (chunk.events && Array.isArray(chunk.events)) {
                    convertedData.bufferData.push(...chunk.events);
                  }
                }

                // 선택적 필터링
                if (
                  !room ||
                  !recordId ||
                  (convertedData.room === room &&
                    convertedData.recordId === recordId)
                ) {
                  results.push(convertedData);
                }
              } else {
                // 기존 구조 그대로 사용
                const data = rawData as BufferUploadData;

                // 선택적 필터링
                if (
                  !room ||
                  !recordId ||
                  (data.room === room && data.recordId === recordId)
                ) {
                  results.push(data);
                }
              }
            } catch (parseError) {
              this.logger.warn(
                `[BACKUP_GET_BY_DEVICE_PARSE_ERROR] ${filePath}: ${parseError}`,
              );
            }
          }
        }
      }

      // 타임스탬프 순으로 정렬
      return results.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      this.logger.error(
        `[BACKUP_GET_BY_DEVICE_ERROR] ${JSON.stringify({
          deviceId,
          room,
          recordId,
          error: error instanceof Error ? error.message : "Unknown error",
        })}`,
      );
      throw error;
    }
  }

  /**
   * 백업된 버퍼 데이터 조회 (새 구조 전용)
   */
  public async getBufferData(
    room?: string,
    recordId?: number,
  ): Promise<BufferUploadData[]> {
    try {
      const results: BufferUploadData[] = [];

      // 날짜별 디렉토리 스캔 (YYYY-MM-DD/deviceId/session_timestamp.json)
      if (!fs.existsSync(this.backupDir)) {
        return results;
      }

      const dateDirs = await fs.promises.readdir(this.backupDir);

      for (const dateDir of dateDirs) {
        // 날짜 형식인지 확인 (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDir)) continue;

        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.lstatSync(datePath).isDirectory()) continue;

        const deviceDirs = await fs.promises.readdir(datePath);

        for (const deviceId of deviceDirs) {
          const devicePath = path.join(datePath, deviceId);
          if (!fs.existsSync(devicePath)) continue;

          // deviceId 디렉토리에서 직접 파일 읽기
          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              // 파일명에서 timestamp 추출 (session_timestamp.json)
              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              const filePath = path.join(devicePath, file);
              try {
                const content = await fs.promises.readFile(filePath, "utf-8");
                const rawData = JSON.parse(content);

                // 새로운 구조인지 확인 (bufferChunks가 있는 경우)
                if (rawData.bufferChunks) {
                  // 새 구조를 기존 구조로 변환
                  const convertedData: BufferUploadData = {
                    room: rawData.room,
                    recordId: rawData.recordId,
                    deviceId: rawData.deviceId || deviceId,
                    url: rawData.url,
                    userAgent: rawData.userAgent,
                    timestamp: rawData.sessionStartTime || rawData.timestamp,
                    bufferData: [],
                  };

                  // 모든 chunk의 이벤트를 하나의 배열로 합치기
                  for (const chunk of rawData.bufferChunks) {
                    if (chunk.events && Array.isArray(chunk.events)) {
                      convertedData.bufferData.push(...chunk.events);
                    }
                  }

                  // 선택적 필터링
                  if (
                    !room ||
                    !recordId ||
                    (convertedData.room === room &&
                      convertedData.recordId === recordId)
                  ) {
                    results.push(convertedData);
                  }
                } else {
                  // 기존 구조 그대로 사용
                  const data = rawData as BufferUploadData;

                  // 선택적 필터링
                  if (
                    !room ||
                    !recordId ||
                    (data.room === room && data.recordId === recordId)
                  ) {
                    results.push(data);
                  }
                }
              } catch (parseError) {
                this.logger.warn(
                  `[BACKUP_GET_PARSE_ERROR] ${filePath}: ${parseError}`,
                );
              }
            }
          }
        }
      }

      // 타임스탬프 순으로 정렬
      return results.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      this.logger.error(
        `[BACKUP_GET_ERROR] ${JSON.stringify({
          room,
          recordId,
          error: error instanceof Error ? error.message : "Unknown error",
        })}`,
      );
      throw error;
    }
  }

  /**
   * 모든 백업 데이터를 디바이스별로 그룹화해서 조회
   */
  public async getAllBackupDataByDevice(
    room?: string,
    recordId?: number,
  ): Promise<Map<string, BufferUploadData[]>> {
    try {
      const deviceMap = new Map<string, BufferUploadData[]>();

      // 새 구조에서 검색: date/deviceId/session_timestamp.json
      if (!fs.existsSync(this.backupDir)) {
        return deviceMap;
      }

      const allItems = await fs.promises.readdir(this.backupDir);
      const dateDirs = allItems
        .filter((dir) => /^\d{4}-\d{2}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a));

      // 모든 날짜와 디바이스 스캔
      for (const dateDir of dateDirs) {
        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.lstatSync(datePath).isDirectory()) continue;

        const deviceDirs = await fs.promises.readdir(datePath);

        for (const deviceId of deviceDirs) {
          const devicePath = path.join(datePath, deviceId);
          if (!fs.existsSync(devicePath)) continue;

          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              const filePath = path.join(devicePath, file);
              try {
                const content = await fs.promises.readFile(filePath, "utf-8");
                const rawData = JSON.parse(content);

                let processedData: BufferUploadData;

                // 새로운 구조인지 확인 (bufferChunks가 있는 경우)
                if (rawData.bufferChunks) {
                  // 새 구조를 기존 구조로 변환
                  processedData = {
                    room: rawData.room,
                    recordId: rawData.recordId,
                    deviceId: rawData.deviceId || deviceId,
                    url: rawData.url,
                    userAgent: rawData.userAgent,
                    timestamp: rawData.sessionStartTime || rawData.timestamp,
                    bufferData: [],
                  };

                  // 모든 chunk의 이벤트를 하나의 배열로 합치기
                  for (const chunk of rawData.bufferChunks) {
                    if (chunk.events && Array.isArray(chunk.events)) {
                      processedData.bufferData.push(...chunk.events);
                    }
                  }
                } else {
                  // 기존 구조 그대로 사용
                  processedData = rawData as BufferUploadData;
                }

                // 선택적 필터링 (room과 recordId가 지정된 경우만)
                if (
                  !room ||
                  !recordId ||
                  (processedData.room === room &&
                    processedData.recordId === recordId)
                ) {
                  const deviceData = deviceMap.get(deviceId) || [];
                  deviceData.push(processedData);
                  deviceMap.set(deviceId, deviceData);
                }
              } catch (parseError) {
                this.logger.warn(
                  `[ALL_BACKUP_PARSE_ERROR] ${filePath}: ${parseError}`,
                );
              }
            }
          }
        }
      }

      // 각 디바이스별로 타임스탬프 내림차순 정렬 (최신 먼저)
      for (const [deviceId, data] of deviceMap) {
        deviceMap.set(
          deviceId,
          data.sort((a, b) => b.timestamp - a.timestamp),
        );
      }

      return deviceMap;
    } catch (error) {
      this.logger.error(`[ALL_BACKUP_BY_DEVICE_ERROR] ${error}`);
      return new Map();
    }
  }

  /**
   * 디바이스별로 그룹화된 백업 데이터 조회 (호환성 유지)
   */
  public async getBufferDataByDevice(
    room?: string,
    recordId?: number,
  ): Promise<Map<string, BufferUploadData[]>> {
    // 새로운 메서드 사용
    return this.getAllBackupDataByDevice(room, recordId);
  }

  /**
   * 백업 데이터를 DB 형식으로 변환
   */
  public convertToDbFormat(bufferData: BufferUploadData): Array<{
    protocol: unknown;
    timestamp: number;
    domain: string;
  }> {
    return bufferData.bufferData.map((item) => {
      // 메서드명에서 도메인 추출
      const [domain] = item.method.split(".");

      return {
        protocol: {
          method: item.method,
          params: item.params,
        },
        timestamp: item.timestamp,
        domain,
      };
    });
  }

  /**
   * 백업 파일 목록 조회 (날짜별 인덱싱 지원)
   */
  public async listBackupFiles(options?: {
    deviceId?: string;
    date?: string; // YYYY-MM-DD
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    beforeDate?: string; // YYYY-MM-DD - 해당 날짜 이전의 백업들만 조회
    limit?: number;
  }): Promise<
    Array<{
      fileName: string;
      room: string;
      recordId: string;
      deviceId: string;
      timestamp: string;
      date: string;
      size: number;
      eventCount?: number;
      url?: string;
    }>
  > {
    const backupFiles: Array<{
      fileName: string;
      room: string;
      recordId: string;
      deviceId: string;
      timestamp: string;
      date: string;
      size: number;
      eventCount?: number;
      url?: string;
    }> = [];

    try {
      if (!fs.existsSync(this.backupDir)) {
        return backupFiles;
      }

      // beforeDate가 지정된 경우 기본 limit을 10으로 설정 (이전 기록 조회)
      const effectiveLimit =
        options?.beforeDate && !options?.limit ? 10 : options?.limit;

      const dateDirs = await fs.promises.readdir(this.backupDir);
      const validDateDirs = dateDirs
        .filter((dir) => /^\d{4}-\d{2}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a)); // 최신 날짜부터

      for (const dateDir of validDateDirs) {
        // 날짜 필터링
        if (options?.date && dateDir !== options.date) continue;
        if (options?.startDate && dateDir < options.startDate) continue;
        if (options?.endDate && dateDir > options.endDate) continue;
        if (options?.beforeDate && dateDir >= options.beforeDate) continue; // 해당 날짜 이전만

        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.lstatSync(datePath).isDirectory()) continue;

        const deviceDirs = await fs.promises.readdir(datePath);

        for (const deviceId of deviceDirs) {
          // deviceId 필터링
          if (options?.deviceId && deviceId !== options.deviceId) continue;

          const devicePath = path.join(datePath, deviceId);
          if (!fs.lstatSync(devicePath).isDirectory()) continue;

          // deviceId 디렉토리에서 직접 파일 읽기 (room 폴더 제거)
          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              const filePath = path.join(devicePath, file);
              const stat = await fs.promises.stat(filePath);

              // 파일명에서 timestamp 추출 (session_timestamp.json)
              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              const timestamp = fileMatch[1];

              // 파일 내용에서 eventCount와 URL 추출
              let eventCount = undefined;
              let url = undefined;
              try {
                const content = await fs.promises.readFile(filePath, "utf-8");
                const data = JSON.parse(content) as BufferUploadData;
                eventCount = data.bufferData?.length;
                url = data.url;
              } catch {
                // 파일 읽기 실패는 무시
              }

              backupFiles.push({
                fileName: file,
                room: "N/A", // room 폴더 제거됨
                recordId: "N/A", // recordId 파일명에서 제거됨
                deviceId,
                timestamp,
                date: dateDir,
                size: stat.size,
                eventCount,
                url,
              });
            }
          }
        }

        // limit 체크 (특정 날짜가 지정된 경우에만 해당 날짜의 모든 파일 가져옴)
        if (
          effectiveLimit &&
          backupFiles.length >= effectiveLimit &&
          !options?.date
        ) {
          break;
        }
      }

      // 타임스탬프 내림차순 정렬 (최신 먼저)
      backupFiles.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

      // limit 적용
      if (effectiveLimit) {
        return backupFiles.slice(0, effectiveLimit);
      }

      return backupFiles;
    } catch (error) {
      this.logger.error(`[BACKUP_LIST_ERROR] ${error}`);
      return [];
    }
  }

  /**
   * 선택된 파일들에서 URL 정보만 추출 (필요할 때만 조회)
   */
  public async getUrlsFromSelectedFiles(filePaths: string[]): Promise<{
    urlByFilePath: Record<string, string>;
    primaryUrl?: string;
  }> {
    const urlByFilePath: Record<string, string> = {};
    let primaryUrl: string | undefined;

    try {
      if (this.isRemoteStorageEnabled) {
        // Beta 환경: S3에서 조회
        primaryUrl = await this.getUrlsFromS3(
          filePaths,
          urlByFilePath,
          primaryUrl,
        );
      } else {
        // 개발 환경: 로컬 파일에서 조회
        primaryUrl = await this.getUrlsFromLocalFiles(
          filePaths,
          urlByFilePath,
          primaryUrl,
        );
      }
    } catch (error) {
      this.logger.error(`[URL_EXTRACT_ERROR] ${error}`);
      return { urlByFilePath: {} };
    }

    this.logger.log(
      `[URL_EXTRACT_SUCCESS] Found URLs in ${Object.keys(urlByFilePath).length}/${filePaths.length} files`,
    );
    return { urlByFilePath, primaryUrl };
  }

  /**
   * S3에서 파일들의 URL 정보 추출
   */
  private async getUrlsFromS3(
    filePaths: string[],
    urlByFilePath: Record<string, string>,
    primaryUrl?: string,
  ): Promise<string | undefined> {
    const bucketName = process.env.AWS_S3_BUCKET || "remote-debug-tools-s3";
    let resolvedPrimary = primaryUrl;

    for (const relativePath of filePaths) {
      let data: BufferUploadData | null = null;

      const match = relativePath.match(
        /^(\d{4}-\d{2}-\d{2})\/([^/]+)\/session_(\d+)\.json$/,
      );
      if (match) {
        const [, dateSegment, rawDeviceId, timestampSegment] = match;
        let deviceId = rawDeviceId;
        try {
          deviceId = decodeURIComponent(rawDeviceId);
        } catch {
          // 디코딩 실패 시 원본 사용
        }
        const timestamp = Number(timestampSegment);
        if (Number.isFinite(timestamp)) {
          data = await this.getBackupByDeviceAndTimestamp(
            deviceId,
            timestamp,
            dateSegment,
          );
        }
      }

      if (!data) {
        try {
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: `backups/${relativePath}`,
          });
          const getResponse = await this.s3Client.send(getCommand);
          if (getResponse.Body) {
            const bodyString = await getResponse.Body.transformToString();
            data = JSON.parse(bodyString) as BufferUploadData;
            if (data.deviceId && Number.isFinite(data.timestamp)) {
              this.setCachedObject(
                this.buildObjectCacheKey(data.deviceId, data.timestamp),
                data,
              );
            }
          }
        } catch (error) {
          this.logger.warn(`[S3_URL_EXTRACT_ERROR] ${relativePath}: ${error}`);
        }
      }

      if (data?.url) {
        urlByFilePath[relativePath] = data.url;
        if (!resolvedPrimary) {
          resolvedPrimary = data.url;
        }
      }
    }

    return resolvedPrimary;
  }

  /**
   * 로컬 파일에서 URL 정보 추출
   */
  private async getUrlsFromLocalFiles(
    filePaths: string[],
    urlByFilePath: Record<string, string>,
    primaryUrl?: string,
  ): Promise<string | undefined> {
    let resolvedPrimary = primaryUrl;
    for (const relativePath of filePaths) {
      const fullPath = path.join(this.backupDir, relativePath);

      if (fs.existsSync(fullPath)) {
        try {
          const content = await fs.promises.readFile(fullPath, "utf-8");
          const data = JSON.parse(content) as BufferUploadData;

          if (data.url) {
            urlByFilePath[relativePath] = data.url;
            // 첫 번째 유효한 URL을 primary URL로 설정
            if (!resolvedPrimary) {
              resolvedPrimary = data.url;
            }
          }
        } catch (parseError) {
          this.logger.warn(
            `[URL_EXTRACT_PARSE_ERROR] ${relativePath}: ${parseError}`,
          );
        }
      } else {
        this.logger.warn(`[URL_EXTRACT_FILE_NOT_FOUND] ${relativePath}`);
      }
    }
    return resolvedPrimary;
  }

  /**
   * 백업 파일 목록 경량 조회 (기존 + 새로운 구조 모두 지원)
   */
  public async listBackupFilesLight(options?: {
    deviceId?: string;
    date?: string; // YYYY-MM-DD
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    beforeDate?: string; // YYYY-MM-DD - 해당 날짜 이전의 백업들만 조회
    limit?: number;
  }): Promise<
    Array<{
      fileName: string;
      room: string;
      recordId: string;
      deviceId: string;
      timestamp: string;
      date: string;
      size: number;
      filePath: string; // 상대 경로 추가
    }>
  > {
    const backupFiles: Array<{
      fileName: string;
      room: string;
      recordId: string;
      deviceId: string;
      timestamp: string;
      date: string;
      size: number;
      filePath: string;
    }> = [];

    try {
      if (!fs.existsSync(this.backupDir)) {
        return backupFiles;
      }

      // beforeDate가 지정된 경우 기본 limit을 10으로 설정 (이전 기록 조회)
      const effectiveLimit =
        options?.beforeDate && !options?.limit ? 10 : options?.limit;

      const allItems = await fs.promises.readdir(this.backupDir);

      // 날짜 디렉토리만 처리 (새로운 구조 전용)
      const dateDirs = allItems
        .filter((dir) => /^\d{4}-\d{2}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a));

      // 새로운 구조 처리 (YYYY-MM-DD/deviceId/session_timestamp.json)
      for (const dateDir of dateDirs) {
        // 날짜 필터링
        if (options?.date && dateDir !== options.date) continue;
        if (options?.startDate && dateDir < options.startDate) continue;
        if (options?.endDate && dateDir > options.endDate) continue;
        if (options?.beforeDate && dateDir >= options.beforeDate) continue; // 해당 날짜 이전만

        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.lstatSync(datePath).isDirectory()) continue;

        const deviceDirs = await fs.promises.readdir(datePath);

        for (const deviceId of deviceDirs) {
          // deviceId 필터링
          if (options?.deviceId && deviceId !== options.deviceId) continue;

          const devicePath = path.join(datePath, deviceId);
          if (!fs.lstatSync(devicePath).isDirectory()) continue;

          // deviceId 디렉토리에서 직접 파일 읽기 (room 폴더 제거)
          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              const filePath = path.join(devicePath, file);
              const stat = await fs.promises.stat(filePath);

              // 파일명에서 timestamp 추출 (파일 내용 읽지 않음!)
              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              const timestamp = fileMatch[1];

              // 상대 경로 구성 (room 제거)
              const relativeFilePath = `${dateDir}/${deviceId}/${file}`;

              backupFiles.push({
                fileName: file,
                room: `Backup-${backupFiles.length + 1}`, // 단순한 순서 번호
                recordId: `backup-${timestamp}`, // 백업용 ID
                deviceId,
                timestamp,
                date: dateDir,
                size: stat.size,
                filePath: relativeFilePath, // 상대 경로 추가
              });
            }
          }
        }

        // limit 체크 (특정 날짜가 지정된 경우 해당 날짜의 모든 파일 가져옴)
        if (
          effectiveLimit &&
          backupFiles.length >= effectiveLimit &&
          !options?.date
        ) {
          break;
        }
      }

      // 타임스탬프 내림차순 정렬 (최신 먼저)
      backupFiles.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

      // limit 적용
      if (effectiveLimit) {
        return backupFiles.slice(0, effectiveLimit);
      }

      this.logger.log(
        `[BACKUP_LIST_LIGHT] Found ${backupFiles.length} files from ${dateDirs.length} date directories`,
      );
      return backupFiles;
    } catch (error) {
      this.logger.error(`[BACKUP_LIST_LIGHT_ERROR] ${error}`);
      return [];
    }
  }

  /**
   * 직접 파일 경로로 S3 백업 데이터 조회 (기존+새로운 구조 모두 지원)
   */
  public async getS3BackupByPaths(
    filePaths: string[],
  ): Promise<BufferUploadData[]> {
    // 파일 경로들을 정렬하여 캐시 키 생성
    const sortedPaths = [...filePaths].sort();
    const cacheKey = sortedPaths.join("|"); // 파이프로 구분

    // 캐시 확인
    if (this.s3PlaybackCache.has(cacheKey)) {
      this.logger.log(`[S3_DIRECT_CACHE_HIT] ${sortedPaths.length} files`);
      return this.s3PlaybackCache.get(cacheKey);
    }

    const results: BufferUploadData[] = [];

    try {
      if (this.isRemoteStorageEnabled) {
        // Beta 환경: S3에서 조회
        for (const relativePath of filePaths) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET || "remote-debug-tools-s3",
              Key: `backups/${relativePath}`, // backups/ prefix 추가
            });

            const getResponse = await this.s3Client.send(getCommand);

            if (getResponse.Body) {
              const bodyString = await getResponse.Body.transformToString();
              const data = JSON.parse(bodyString) as BufferUploadData;
              results.push(data);
              this.logger.log(`[S3_DIRECT_FILE_LOADED] ${relativePath}`);
            }
          } catch (error) {
            this.logger.warn(
              `[S3_DIRECT_FILE_ERROR] ${relativePath}: ${error}`,
            );
          }
        }
      } else {
        // 개발 환경: 로컬 파일에서 조회
        for (const relativePath of filePaths) {
          const fullPath = path.join(this.backupDir, relativePath);

          if (fs.existsSync(fullPath)) {
            try {
              const content = await fs.promises.readFile(fullPath, "utf-8");
              const rawData = JSON.parse(content);

              // 새로운 구조 (bufferChunks)에서 기존 구조로 변환
              let convertedData: BufferUploadData;

              if (rawData.bufferChunks && Array.isArray(rawData.bufferChunks)) {
                const allEvents = rawData.bufferChunks.flatMap(
                  (chunk: any) => chunk.events || [],
                );

                convertedData = {
                  room: rawData.room,
                  recordId: rawData.recordId,
                  deviceId: rawData.deviceId,
                  url: rawData.url,
                  userAgent: rawData.userAgent,
                  bufferData: allEvents,
                  timestamp: rawData.sessionStartTime || rawData.timestamp,
                  date: rawData.date,
                  sessionStartTime: rawData.sessionStartTime,
                };

                this.logger.log(
                  `[S3_SELECTED_FILE_CONVERTED] ${relativePath}: ${rawData.bufferChunks.length} chunks → ${allEvents.length} events`,
                );
              } else {
                convertedData = rawData as BufferUploadData;
                this.logger.log(`[S3_SELECTED_FILE_LOADED] ${relativePath}`);
              }

              results.push(convertedData);
            } catch (parseError) {
              this.logger.warn(
                `[S3_SELECTED_FILE_PARSE_ERROR] ${relativePath}: ${parseError}`,
              );
            }
          } else {
            this.logger.warn(`[S3_SELECTED_FILE_NOT_FOUND] ${relativePath}`);
          }
        }
      }

      // timestamp 순으로 정렬
      results.sort((a, b) => b.timestamp - a.timestamp);

      // 캐시에 저장 (선택된 파일 조합별로)
      this.s3PlaybackCache.set(cacheKey, results);

      // 캐시 크기 제한
      if (this.s3PlaybackCache.size > this.maxS3CacheSize) {
        const firstKey = this.s3PlaybackCache.keys().next().value;
        this.s3PlaybackCache.delete(firstKey);
      }

      this.logger.log(
        `[S3_SELECTED_FILES_SUCCESS] Loaded ${results.length}/${filePaths.length} files, cached`,
      );
      return results;
    } catch (error) {
      this.logger.error(`[S3_SELECTED_FILES_ERROR] ${error}`);
      throw error;
    }
  }

  /**
   * S3 백업 재생 전용 (현재 시간 기준 이전 기록들만 필터링)
   */
  public async getS3BackupForPlayback(
    room: string,
    recordId: number,
    deviceId: string,
    date: string,
    currentTimestamp?: number, // 현재 녹화 세션의 시간 (밀리초)
    recordService?: any, // Record 서비스 추가 (DB에서 생성 시간 조회용)
  ): Promise<BufferUploadData[]> {
    // 현재 녹화 세션의 실제 생성 시간 조회
    if (!currentTimestamp) {
      // Room 이름에서 timestamp 추출 시도 (Buffer 모드의 경우)
      const roomTimestampMatch = room.match(
        /(?:Record|Live|Buffer)-(?:\w+-)?(\d+)/,
      );
      if (roomTimestampMatch) {
        currentTimestamp = parseInt(roomTimestampMatch[1]);
        this.logger.log(
          `[S3_TIMESTAMP_EXTRACTED] Room: ${room} → Current timestamp: ${currentTimestamp}`,
        );
      } else if (recordService && recordId) {
        // DB에서 녹화 세션의 실제 생성 시간 조회
        try {
          const record = await recordService.findOne(recordId);
          if (record && record.createdAt) {
            currentTimestamp = record.createdAt.getTime(); // Date를 밀리초로 변환
            this.logger.log(
              `[S3_TIMESTAMP_FROM_DB] RecordId: ${recordId} → Timestamp: ${currentTimestamp} (${record.createdAt.toISOString()})`,
            );
          } else {
            this.logger.warn(
              `[S3_RECORD_NOT_FOUND] Record ${recordId} not found in DB`,
            );
            currentTimestamp = Date.now();
          }
        } catch (error) {
          this.logger.error(
            `[S3_DB_QUERY_ERROR] Failed to query record ${recordId}: ${error}`,
          );
          currentTimestamp = Date.now();
        }
      } else {
        this.logger.warn(
          `[S3_TIMESTAMP_FALLBACK] Cannot extract timestamp from room: ${room}, using current time`,
        );
        currentTimestamp = Date.now(); // 기본값: 현재 시간
      }
    }

    const cacheKey = `${room}_${recordId}_${deviceId}_${date}_${currentTimestamp}`;

    // 캐시 확인
    if (this.s3PlaybackCache.has(cacheKey)) {
      this.logger.log(`[S3_CACHE_HIT] ${cacheKey}`);
      return this.s3PlaybackCache.get(cacheKey);
    }

    try {
      const results: BufferUploadData[] = [];

      // 현재 녹화 세션의 날짜 추출 (한국시간 기준으로 같은 날짜 폴더에서만 이전 기록 검색)
      const currentDate = new Date(currentTimestamp + 9 * 60 * 60 * 1000); // UTC+9 (한국시간)
      const targetDateDir = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD 형태

      this.logger.log(`[S3_CURRENT_RECORD] 🎯 Analyzing current record:`);
      this.logger.log(`  ⏰ Input timestamp: ${currentTimestamp}`);
      this.logger.log(`  📅 Converted date: ${currentDate.toISOString()}`);
      this.logger.log(`  📁 Target folder: ${targetDateDir}`);
      this.logger.log(
        `[S3_PREVIOUS_RECORDS] 🔍 Will search for records BEFORE ${currentTimestamp} in folder ${targetDateDir}/${deviceId}`,
      );

      // 같은 날짜 폴더에서만 이전 기록들 검색
      const devicePath = path.join(this.backupDir, targetDateDir, deviceId);
      if (!fs.existsSync(devicePath)) {
        this.logger.log(
          `[S3_NO_SAME_DAY_RECORDS] No backup folder found: ${devicePath}`,
        );
        return [];
      }

      const files = await fs.promises.readdir(devicePath);
      this.logger.log(
        `[S3_SAME_DAY_FILES] Found ${files.length} files in ${targetDateDir}/${deviceId}`,
      );

      for (const file of files) {
        if (file.endsWith(".json")) {
          const fileMatch = file.match(/session_(\d+)\.json/);
          if (!fileMatch) continue;

          const fileTimestamp = parseInt(fileMatch[1]);

          // 현재 시간보다 이전 기록만 필터링
          const timeDiff = currentTimestamp - fileTimestamp;
          if (fileTimestamp >= currentTimestamp) {
            this.logger.log(`[S3_SKIP_FUTURE_RECORD] ⚠️ Skipping ${file}`);
            this.logger.log(
              `  📄 File timestamp: ${fileTimestamp} (${new Date(fileTimestamp).toISOString()})`,
            );
            this.logger.log(
              `  🎯 Current timestamp: ${currentTimestamp} (${new Date(currentTimestamp).toISOString()})`,
            );
            this.logger.log(
              `  ❌ Reason: File is ${Math.abs(timeDiff)}ms AFTER current time`,
            );
            continue; // 현재 시간 이후 기록은 제외
          } else {
            this.logger.log(
              `[S3_INCLUDE_PREVIOUS_RECORD] ✅ Including ${file}`,
            );
            this.logger.log(
              `  📄 File timestamp: ${fileTimestamp} (${new Date(fileTimestamp).toISOString()})`,
            );
            this.logger.log(
              `  ⏰ Time difference: ${timeDiff}ms BEFORE current time`,
            );
          }

          const filePath = path.join(devicePath, file);
          try {
            const content = await fs.promises.readFile(filePath, "utf-8");
            const rawData = JSON.parse(content);

            // 새로운 구조 (bufferChunks)에서 기존 구조로 변환
            let convertedData: BufferUploadData;

            if (rawData.bufferChunks && Array.isArray(rawData.bufferChunks)) {
              // 새로운 구조: bufferChunks의 모든 events를 하나로 합침
              const allEvents = rawData.bufferChunks.flatMap(
                (chunk: any) => chunk.events || [],
              );

              convertedData = {
                room: rawData.room,
                recordId: rawData.recordId,
                deviceId: rawData.deviceId,
                url: rawData.url,
                userAgent: rawData.userAgent,
                bufferData: allEvents, // 변환된 이벤트 배열
                timestamp: rawData.sessionStartTime || rawData.timestamp,
                date: rawData.date,
                sessionStartTime: rawData.sessionStartTime,
              };

              this.logger.log(
                `[S3_DATA_CONVERTED] ${file}: ${rawData.bufferChunks.length} chunks → ${allEvents.length} events`,
              );
            } else if (rawData.bufferData) {
              // 기존 구조: 그대로 사용
              convertedData = rawData as BufferUploadData;
            } else {
              // 데이터가 없거나 잘못된 구조
              this.logger.warn(
                `[S3_INVALID_STRUCTURE] ${filePath}: No bufferData or bufferChunks found`,
              );
              continue;
            }

            // 이전 기록들만 수집 (같은 날짜, 같은 디바이스의 이전 기록들)
            results.push(convertedData);
            const recordDate = new Date(fileTimestamp);
            this.logger.log(
              `[S3_PREVIOUS_RECORD_FOUND] ${targetDateDir}/${file}`,
            );
            this.logger.log(
              `[S3_PREVIOUS_RECORD_DETAIL] timestamp: ${fileTimestamp} → ${recordDate.toISOString()}`,
            );
          } catch (parseError) {
            this.logger.warn(
              `[S3_PLAYBACK_PARSE_ERROR] ${filePath}: ${parseError}`,
            );
          }
        }
      }

      if (results.length === 0) {
        this.logger.log(
          `[S3_NO_PREVIOUS_RECORDS] No previous records found in ${targetDateDir}/${deviceId} before timestamp ${currentTimestamp}`,
        );
        return [];
      }

      // 정렬 전 상태 로그
      this.logger.log(
        `[S3_BEFORE_SORT] Found ${results.length} previous records in same day:`,
      );
      results.forEach((r, index) => {
        const recordDate = new Date(r.timestamp);
        const timeDiff = currentTimestamp - r.timestamp;
        this.logger.log(
          `  ${index + 1}. ${recordDate.toISOString()} (${timeDiff}ms ago)`,
        );
      });

      // timestamp 순으로 정렬 (최신순 - 가장 최근 이전 기록이 첫 번째)
      results.sort((a, b) => b.timestamp - a.timestamp);

      // 정렬 후 상태 로그
      this.logger.log(
        `[S3_AFTER_SORT] Sorted ${results.length} previous records (latest previous first):`,
      );
      results.forEach((r, index) => {
        const recordDate = new Date(r.timestamp);
        const timeDiff = currentTimestamp - r.timestamp;
        this.logger.log(
          `  ${index + 1}. ${recordDate.toISOString()} (${timeDiff}ms ago) ← ${index === 0 ? "Most recent previous" : "Older previous"}`,
        );
      });

      // 캐시에 저장
      this.s3PlaybackCache.set(cacheKey, results);

      // 캐시 크기 제한
      if (this.s3PlaybackCache.size > this.maxS3CacheSize) {
        const firstKey = this.s3PlaybackCache.keys().next().value;
        this.s3PlaybackCache.delete(firstKey);
      }

      const resultSummary = results
        .slice(0, 3)
        .map((r) => {
          const recordDate = new Date(r.timestamp);
          return `${recordDate.toISOString().split("T")[0]} ${recordDate.toTimeString().split(" ")[0]}`;
        })
        .join(", ");

      this.logger.log(
        `[S3_PREVIOUS_RECORDS_LOADED] Found ${results.length} previous records before ${currentTimestamp}`,
      );
      if (results.length > 0) {
        this.logger.log(
          `[S3_PREVIOUS_RECORDS_TOP3] Latest previous: ${resultSummary}${results.length > 3 ? "..." : ""}`,
        );
      }
      return results;
    } catch (error) {
      this.logger.error(`[S3_PLAYBACK_ERROR] ${cacheKey}, error: ${error}`);
      return [];
    }
  }

  /**
   * 버퍼 데이터를 파일로 저장
   */
  public async saveBufferDataToFile(
    bufferData: BufferUploadData,
  ): Promise<void> {
    try {
      const { deviceId, timestamp, date } = bufferData;

      console.log(
        `[BUFFER_SAVE_DEBUG] Starting save - deviceId: ${deviceId}, timestamp: ${timestamp}, date: ${date}`,
      );
      console.log(`[BUFFER_SAVE_DEBUG] bufferData:`, {
        room: bufferData.room,
        recordId: bufferData.recordId,
        eventCount: bufferData.bufferData?.length || 0,
      });

      // 한국시간 기준 날짜 사용 (date가 없으면 현재 날짜)
      const targetDate = date || new Date().toISOString().split("T")[0];

      // 저장 경로: backups/YYYY-MM-DD/deviceId/session_timestamp.json
      const devicePath = path.join(this.backupDir, targetDate, deviceId);

      console.log(`[BUFFER_SAVE_DEBUG] Target path: ${devicePath}`);

      // 디렉토리 생성
      if (!fs.existsSync(devicePath)) {
        console.log(`[BUFFER_SAVE_DEBUG] Creating directory: ${devicePath}`);
        fs.mkdirSync(devicePath, { recursive: true });
      }

      // timestamp로 고유한 파일명 생성 (flush 시점마다 다른 timestamp)
      const fileName = `session_${timestamp}.json`;
      const filePath = path.join(devicePath, fileName);

      console.log(`[BUFFER_SAVE_DEBUG] Saving to file: ${filePath}`);
      console.log(
        `[BUFFER_SAVE_DEBUG] File exists before save: ${fs.existsSync(filePath)}`,
      );

      // 파일이 이미 존재하면 경고하고 덮어쓰기 방지
      if (fs.existsSync(filePath)) {
        const existingSize = fs.statSync(filePath).size;
        console.warn(
          `[BUFFER_SAVE_DEBUG] File already exists! Size: ${existingSize} bytes, will be overwritten`,
        );
      }

      // 파일 저장
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(bufferData, null, 2),
        "utf-8",
      );

      // 파일이 실제로 생성되었는지 확인
      const fileExists = fs.existsSync(filePath);
      const fileSize = fileExists ? fs.statSync(filePath).size : 0;

      console.log(
        `[BUFFER_SAVE_DEBUG] File created: ${fileExists}, size: ${fileSize} bytes`,
      );
      this.logger.log(
        `[BUFFER_SAVED] ${filePath}, events: ${bufferData.bufferData?.length || 0}`,
      );
    } catch (error) {
      this.logger.error(
        `[BUFFER_SAVE_ERROR] Failed to save buffer data: ${error}`,
      );
      console.error(`[BUFFER_SAVE_DEBUG] Full error:`, error);
      throw error;
    }
  }
}
