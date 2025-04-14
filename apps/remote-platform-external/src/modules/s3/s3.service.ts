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
  private readonly s3Client: S3Client;

  // 메모리 캐시 (최근 접근한 백업 데이터)
  private memoryCache = new Map<
    string,
    { data: BufferUploadData[]; expiresAt: number }
  >();
  private maxCacheSize = 1000; // 최대 500개 룸의 데이터 캐싱
  private readonly MEMORY_CACHE_TTL_MS = 2 * 60 * 1000;

  private readonly CACHE_TTL_MS = 60 * 1000;
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

  // 세션별 파일 경로 추적
  private sessionFiles = new Map<string, string>();

  private sanitizeMetadata(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const sanitized = value
      .replace(/[\r\n]+/g, " ") // 줄바꿈 제거
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, "") // 제어 문자 제거
      .replace(/[\u0080-\uFFFF]/g, "") // 비 ASCII 문자 제거 (S3 메타데이터 제한)
      .trim();

    if (!sanitized) {
      return undefined;
    }

    return sanitized.slice(0, 1024);
  }

  constructor() {
    // 백업 디렉토리 생성
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // 환경변수 디버깅
    this.logger.log(
      `[S3_INIT] Environment detection: APP_ENV=${process.env.APP_ENV}, NODE_ENV=${process.env.NODE_ENV}, ` +
        `resolved=${this.runtimeEnv}, toS3=${this.isRemoteStorageEnabled}`,
    );
    this.logger.log(
      `[S3_INIT] AWS_REGION: ${process.env.AWS_REGION || "ap-northeast-2"}`,
    );
    this.logger.log(
      `[S3_INIT] AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET || "remote-debug-tools-s3"}`,
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

  private getFromMemoryCache(key: string): BufferUploadData[] | null {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }
    return this.cloneBufferDataArray(entry.data);
  }

  private setMemoryCache(key: string, data: BufferUploadData[]): void {
    if (
      !this.memoryCache.has(key) &&
      this.memoryCache.size >= this.maxCacheSize
    ) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      data: this.cloneBufferDataArray(data),
      expiresAt: Date.now() + this.MEMORY_CACHE_TTL_MS,
    });
  }

  /**
   * 버퍼 데이터를 S3에 업로드 (세션별로 하나의 파일에 append)
   */
  public async uploadBufferData(data: BufferUploadData): Promise<string> {
    const deviceId = data.deviceId || "unknown-device";
    const sessionKey = `${data.room}_${data.recordId}`;

    // Starting buffer upload for session: ${sessionKey}

    // 세션별로 파일 경로 확인
    let filePath = this.sessionFiles.get(sessionKey);
    let isNewSession = false;

    if (!filePath) {
      // 새 세션인 경우 파일 생성
      isNewSession = true;
      const sessionStartTime =
        data.sessionStartTime || data.timestamp || Date.now();

      // 한국시간 기준으로 날짜 결정 (UTC+9)
      const koreanTime = new Date(sessionStartTime + 9 * 60 * 60 * 1000);
      const recordDate = koreanTime.toISOString().split("T")[0]; // YYYY-MM-DD

      // 파일명은 세션 시작 시간으로 고정
      const fileName = `session_${sessionStartTime}.json`;
      const deviceDir = path.join(this.backupDir, recordDate, deviceId);
      filePath = path.join(deviceDir, fileName);

      // Creating new session file: ${fileName}

      // 디렉토리 생성
      await fs.promises.mkdir(deviceDir, { recursive: true });

      // 세션 파일 경로 저장
      this.sessionFiles.set(sessionKey, filePath);
    } else {
      // Appending to existing session file
    }

    try {
      if (isNewSession) {
        // 새 세션: 파일 생성 및 초기 구조 작성
        const sessionData = {
          room: data.room,
          recordId: data.recordId,
          deviceId: data.deviceId,
          url: data.url,
          userAgent: data.userAgent,
          sessionStartTime: data.sessionStartTime || data.timestamp,
          date: filePath.split("/").slice(-3, -2)[0], // 날짜 추출
          bufferChunks: [
            {
              timestamp: data.timestamp,
              eventCount: data.bufferData.length,
              events: data.bufferData,
            },
          ],
        };

        await fs.promises.writeFile(
          filePath,
          JSON.stringify(sessionData, null, 2),
        );

        // New session file created: ${data.bufferData.length} events
      } else {
        // 기존 세션: 파일에 append
        const existingContent = await fs.promises.readFile(filePath, "utf-8");
        const sessionData = JSON.parse(existingContent);

        const currentChunkCount = sessionData.bufferChunks?.length || 0;

        // 새로운 chunk 추가
        sessionData.bufferChunks.push({
          timestamp: data.timestamp,
          eventCount: data.bufferData.length,
          events: data.bufferData,
        });

        // 파일 다시 쓰기
        await fs.promises.writeFile(
          filePath,
          JSON.stringify(sessionData, null, 2),
        );

        this.logger.log(
          `[EXISTING_SESSION_FILE_UPDATED] File updated at: ${filePath}, chunks: ${currentChunkCount} → ${sessionData.bufferChunks.length}, new events: ${data.bufferData.length}`,
        );
      }

      this.logger.log(
        `[BACKUP_UPLOAD_SUCCESS] ${JSON.stringify({
          room: data.room,
          recordId: data.recordId,
          deviceId,
          eventCount: data.bufferData.length,
          isNewSession,
          filePath,
          sessionKey,
        })}`,
      );

      // 실제 S3 사용 시 아래 코드 활성화
      /*
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'ap-northeast-2',
      })

      const params = {
        Bucket: process.env.S3_BUCKET_NAME || 'remote-debugging-backup',
        Key: s3Key,
        Body: JSON.stringify(uploadData),
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
        Metadata: {
          deviceId,
          room: data.room,
          recordId: data.recordId.toString(),
          timestamp: flushTimestamp.toString(),
          eventCount: data.bufferData.length.toString(),
        },
      }

      const result = await s3.upload(params).promise()
      return result.Location
      */

      return filePath;
    } catch (error) {
      this.logger.error(
        `[BACKUP_UPLOAD_ERROR] ${JSON.stringify({
          room: data.room,
          recordId: data.recordId,
          deviceId,
          sessionKey,
          filePath,
          error: error instanceof Error ? error.message : "Unknown error",
        })}`,
      );
      throw error;
    }
  }

  /**
   * 환경에 따른 데이터 저장 (beta: S3, dev: 로컬 파일)
   */
  public async saveBufferDataToFile(data: BufferUploadData): Promise<string> {
    this.logger.log(
      `[SAVE_BUFFER_CALLED] saveToS3: ${this.isRemoteStorageEnabled}, deviceId: ${data.deviceId}`,
    );

    if (this.isRemoteStorageEnabled) {
      // Beta 환경: S3 업로드
      this.logger.log(`[SAVE_BUFFER_S3] Uploading to S3...`);
      return await this.uploadToS3Direct(data);
    } else {
      // 개발 환경: 로컬 파일 저장
      this.logger.log(`[SAVE_BUFFER_LOCAL] Saving to local file...`);
      return await this.saveToLocalFile(data);
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
        const inFlight = this.listInFlight.get(cacheKey);
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
        const data = await this.getBufferData("", undefined);
        return this.cloneBufferDataArray(data);
      }

      const cacheKey = this.buildListCacheKey(deviceId, "local");
      const cached = this.getFromMemoryCache(cacheKey);
      if (cached) {
        return cached;
      }

      const allData = await this.getBufferData("", undefined);
      const filtered = allData.filter((data) => data.deviceId === deviceId);
      this.setMemoryCache(cacheKey, filtered);
      return this.cloneBufferDataArray(filtered);
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
      const results: BufferUploadData[] = [];
      const MAX_RESULTS = 200;

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

      for (const searchDate of searchDates) {
        const prefix = deviceId
          ? `backups/${searchDate}/${deviceId}/`
          : `backups/${searchDate}/`;

        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          MaxKeys: MAX_RESULTS,
        });

        const listResponse = await this.s3Client.send(listCommand);
        if (!listResponse.Contents) {
          continue;
        }

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

          if (results.length >= MAX_RESULTS) {
            break;
          }
        }

        if (results.length >= MAX_RESULTS) {
          break;
        }
      }

      results.sort((a, b) => b.timestamp - a.timestamp);
      return results;
    } catch (error) {
      this.logger.error(`[S3_CLOUD_QUERY_ERROR] Failed to query S3: ${error}`);
      return [];
    }
  }

  /**
   * S3에 직접 업로드 (EC2 IAM Role 사용)
   */
  private async uploadToS3Direct(data: BufferUploadData): Promise<string> {
    try {
      const { deviceId, timestamp, date } = data;
      const targetDate =
        date ||
        new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0]; // 한국시간 기준
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

      // S3 upload completed: ${s3Key}

      return s3Key;
    } catch (error) {
      this.logger.error(`[S3_UPLOAD_ERROR] Failed to upload to S3: ${error}`);
      throw error;
    }
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
   * 로컬 파일 저장
   */
  private async saveToLocalFile(data: BufferUploadData): Promise<string> {
    try {
      const { deviceId, timestamp, date } = data;

      // 한국시간 기준 날짜 사용 (date가 없으면 현재 한국시간 날짜)
      const targetDate =
        date ||
        new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

      // 저장 경로: backups/YYYY-MM-DD/deviceId/
      const devicePath = path.join(
        this.backupDir,
        targetDate,
        deviceId || "unknown-device",
      );

      if (!fs.existsSync(devicePath)) {
        fs.mkdirSync(devicePath, { recursive: true });
      }

      const fileName = `session_${timestamp}.json`;
      const filePath = path.join(devicePath, fileName);

      // 파일 저장
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        "utf-8",
      );

      // Local file saved: ${data.bufferData?.length || 0} events
      return filePath;
    } catch (error) {
      this.logger.error(
        `[BUFFER_SAVE_ERROR] Failed to save buffer data to file: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * S3에서 버퍼 데이터 조회
   */
  public async getBufferData(
    room: string,
    recordId?: number,
  ): Promise<BufferUploadData[]> {
    try {
      // 캐시 확인 (deviceId 기반)
      const deviceId = "unknown-device"; // TODO: deviceId를 파라미터로 받아야 함
      const cacheKey = `device_${deviceId}`;
      const cachedData = this.getFromMemoryCache(cacheKey);
      if (cachedData) {
        this.logger.log(`[BACKUP_GET_CACHE_HIT] ${cacheKey}`);
        return cachedData;
      }

      const results: BufferUploadData[] = [];

      // 날짜별 디렉토리 스캔
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

          // deviceId 디렉토리에서 직접 파일 읽기 (room 폴더 제거)
          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              // 파일명에서 timestamp 확인 (session_timestamp.json - recordId 제거)
              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              // recordId 필터링은 더 이상 불가능 (파일명에 recordId 없음)

              const filePath = path.join(devicePath, file);
              const content = await fs.promises.readFile(filePath, "utf-8");
              const parsed = JSON.parse(content) as BufferUploadData;
              this.setCachedObject(
                this.buildObjectCacheKey(
                  parsed.deviceId || deviceId,
                  parsed.timestamp,
                ),
                parsed,
              );
              results.push(parsed);
            }
          }
        }
      }

      // 타임스탬프 순으로 정렬
      results.sort((a, b) => a.timestamp - b.timestamp);

      // 캐시에 저장 (deviceId 기반)
      if (results.length > 0) {
        const key = `device_${results[0].deviceId}`;
        this.setMemoryCache(key, results);
      }

      return results;
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
   * 디바이스별로 그룹화된 백업 데이터 조회 (모든 구조 지원)
   */
  public async getBufferDataByDevice(
    room: string,
    recordId: number,
  ): Promise<Map<string, BufferUploadData[]>> {
    try {
      const deviceMap = new Map<string, BufferUploadData[]>();
      const allData = await this.getBufferData(room, recordId);

      // 디바이스별로 그룹화
      for (const data of allData) {
        const deviceId = data.deviceId || "unknown-device";
        if (!deviceMap.has(deviceId)) {
          deviceMap.set(deviceId, []);
        }
        deviceMap.get(deviceId).push(data);
      }

      return deviceMap;
    } catch (error) {
      this.logger.error(`[BACKUP_GET_BY_DEVICE_ERROR] ${error}`);
      throw error;
    }
  }

  /**
   * 특정 디바이스의 이전 기록 조회 (세션 연속성용)
   */
  public async getPreviousSessionData(
    deviceId: string,
    url: string,
  ): Promise<BufferUploadData[]> {
    try {
      const deviceData = await this.getS3BackupData(deviceId);

      if (deviceData.length === 0) {
        return [];
      }

      // URL 패턴 매칭 (같은 도메인)
      const currentDomain = new URL(url).hostname;
      const matchingData = deviceData.filter((data) => {
        if (!data.url) return false;
        try {
          const dataDomain = new URL(data.url).hostname;
          return dataDomain === currentDomain;
        } catch {
          return false;
        }
      });

      // 최신 순으로 정렬
      matchingData.sort((a, b) => b.timestamp - a.timestamp);

      this.logger.log(
        `[PREVIOUS_SESSION_FOUND] Found ${matchingData.length} previous sessions for device ${deviceId} on domain ${currentDomain}`,
      );

      return matchingData;
    } catch (error) {
      this.logger.error(
        `[PREVIOUS_SESSION_ERROR] ${JSON.stringify({
          deviceId,
          url,
          error: error instanceof Error ? error.message : "Unknown error",
        })}`,
      );
      return [];
    }
  }

  /**
   * 세션 연속성을 위한 이전 기록 로딩
   */
  public async loadPreviousSessionForContinuation(
    deviceId: string,
    url: string,
  ): Promise<
    Array<{
      method: string;
      params: unknown;
      timestamp: number;
    }>
  > {
    try {
      const previousSessions = await this.getPreviousSessionData(deviceId, url);

      if (previousSessions.length === 0) {
        return [];
      }

      // 가장 최근 세션의 이벤트들만 반환
      const latestSession = previousSessions[0];
      const allEvents: Array<{
        method: string;
        params: unknown;
        timestamp: number;
      }> = [];

      // 모든 chunk에서 이벤트 수집 (파일 구조에 따라)
      if ((latestSession as any).bufferChunks) {
        for (const chunk of (latestSession as any).bufferChunks) {
          if (chunk.events && Array.isArray(chunk.events)) {
            allEvents.push(...chunk.events);
          }
        }
      } else if (
        latestSession.bufferData &&
        Array.isArray(latestSession.bufferData)
      ) {
        // 기존 구조 지원
        allEvents.push(...latestSession.bufferData);
      }

      // timestamp 기준으로 정렬
      allEvents.sort((a, b) => a.timestamp - b.timestamp);

      this.logger.log(
        `[PREVIOUS_SESSION_LOADED] Loaded ${allEvents.length} events from previous session for device ${deviceId}`,
      );

      return allEvents;
    } catch (error) {
      this.logger.error(
        `[PREVIOUS_SESSION_LOAD_ERROR] ${JSON.stringify({
          deviceId,
          url,
          error: error instanceof Error ? error.message : "Unknown error",
        })}`,
      );
      return [];
    }
  }

  /**
   * 세션 종료 시 메모리 정리
   */
  public cleanupSession(
    deviceId: string,
    room?: string,
    recordId?: number,
  ): void {
    // 캐시에서 해당 디바이스 관련 데이터 정리
    for (const [key] of this.memoryCache) {
      if (key.includes(deviceId)) {
        this.memoryCache.delete(key);
      }
    }

    // 세션 파일 경로 정리
    if (room && recordId !== undefined) {
      const sessionKey = `${room}_${recordId}`;
      this.sessionFiles.delete(sessionKey);
    }

    this.logger.log(
      `[SESSION_CLEANUP] ${JSON.stringify({
        deviceId,
        room,
        recordId,
      })}`,
    );
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

          // deviceId 디렉토리에서 직접 파일 읽기 (room 폴더 제거됨)
          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              const filePath = path.join(devicePath, file);
              const stat = await fs.promises.stat(filePath);

              // 파일명에서 timestamp 추출 (session_timestamp.json - recordId 제거)
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
                // 파일 읽기 실패 시 무시
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
}
