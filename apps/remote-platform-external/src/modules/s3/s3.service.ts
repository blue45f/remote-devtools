import * as fs from "fs";
import * as path from "path";

import { Injectable, Logger } from "@nestjs/common";
import { BaseS3Service, BufferUploadData } from "@remote-platform/core";

export { BufferUploadData };

@Injectable()
export class S3Service extends BaseS3Service {
  protected readonly logger = new Logger(S3Service.name);

  // In-memory cache (recently accessed backup data, dev mode only)
  private memoryCache = new Map<
    string,
    { data: BufferUploadData[]; expiresAt: number }
  >();
  private readonly maxMemoryCacheSize = 1000;
  private readonly MEMORY_CACHE_TTL_MS = 2 * 60 * 1000;

  // Track file paths per session
  private sessionFiles = new Map<string, string>();

  constructor() {
    super();
    this.logInit();
    this.logger.log(
      `[S3_INIT] AWS_REGION: ${process.env.AWS_REGION || "ap-northeast-2"}`,
    );
    this.logger.log(
      `[S3_INIT] AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET || "remote-debug-tools-s3"}`,
    );
  }

  // -------------------------------------------------------------------------
  // Memory cache (dev-mode supplement)
  // -------------------------------------------------------------------------

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
      this.memoryCache.size >= this.maxMemoryCacheSize
    ) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      data: this.cloneBufferDataArray(data),
      expiresAt: Date.now() + this.MEMORY_CACHE_TTL_MS,
    });
  }

  // -------------------------------------------------------------------------
  // Upload & save
  // -------------------------------------------------------------------------

  /**
   * Upload buffer data to S3 (appends to a single file per session).
   */
  public async uploadBufferData(data: BufferUploadData): Promise<string> {
    const deviceId = data.deviceId || "unknown-device";
    const sessionKey = `${data.room}_${data.recordId}`;

    let filePath = this.sessionFiles.get(sessionKey);
    let isNewSession = false;

    if (!filePath) {
      isNewSession = true;
      const sessionStartTime =
        data.sessionStartTime || data.timestamp || Date.now();

      const koreanTime = new Date(sessionStartTime + 9 * 60 * 60 * 1000);
      const recordDate = koreanTime.toISOString().split("T")[0];

      const fileName = `session_${sessionStartTime}.json`;
      const deviceDir = path.join(this.backupDir, recordDate, deviceId);
      filePath = path.join(deviceDir, fileName);

      await fs.promises.mkdir(deviceDir, { recursive: true });
      this.sessionFiles.set(sessionKey, filePath);
    }

    try {
      if (isNewSession) {
        const sessionData = {
          room: data.room,
          recordId: data.recordId,
          deviceId: data.deviceId,
          url: data.url,
          userAgent: data.userAgent,
          sessionStartTime: data.sessionStartTime || data.timestamp,
          date: filePath.split("/").slice(-3, -2)[0],
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
      } else {
        const existingContent = await fs.promises.readFile(filePath, "utf-8");
        const sessionData = JSON.parse(existingContent);

        const currentChunkCount = sessionData.bufferChunks?.length || 0;

        sessionData.bufferChunks.push({
          timestamp: data.timestamp,
          eventCount: data.bufferData.length,
          events: data.bufferData,
        });

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
   * Save data based on environment (beta: S3, dev: local file).
   */
  public async saveBufferDataToFile(data: BufferUploadData): Promise<string> {
    this.logger.log(
      `[SAVE_BUFFER_CALLED] saveToS3: ${this.isRemoteStorageEnabled}, deviceId: ${data.deviceId}`,
    );

    if (this.isRemoteStorageEnabled) {
      this.logger.log(`[SAVE_BUFFER_S3] Uploading to S3...`);
      return await this.uploadToS3(data);
    } else {
      this.logger.log(`[SAVE_BUFFER_LOCAL] Saving to local file...`);
      return await this.saveToLocalFile(data);
    }
  }

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------

  /**
   * Retrieve backup data from S3 (in beta/production environment).
   */
  public async getS3BackupData(
    deviceId: string,
    beforeTimestamp?: number,
    targetDate?: string,
  ): Promise<BufferUploadData[]> {
    if (this.isRemoteStorageEnabled) {
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
      const filtered = allData.filter((d) => d.deviceId === deviceId);
      this.setMemoryCache(cacheKey, filtered);
      return this.cloneBufferDataArray(filtered);
    }
  }

  // -------------------------------------------------------------------------
  // Local file operations
  // -------------------------------------------------------------------------

  /**
   * Save to local file.
   */
  protected async saveToLocalFile(data: BufferUploadData): Promise<string> {
    try {
      const { deviceId, timestamp, date } = data;

      const targetDate =
        date ||
        new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

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

      await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        "utf-8",
      );

      return filePath;
    } catch (error: any) {
      this.logger.error(
        `[BUFFER_SAVE_ERROR] Failed to save buffer data to file: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieve buffer data from local files.
   */
  public async getBufferData(
    room: string,
    recordId?: number,
  ): Promise<BufferUploadData[]> {
    try {
      const deviceId = "unknown-device";
      const cacheKey = `device_${deviceId}`;
      const cachedData = this.getFromMemoryCache(cacheKey);
      if (cachedData) {
        this.logger.log(`[BACKUP_GET_CACHE_HIT] ${cacheKey}`);
        return cachedData;
      }

      const results: BufferUploadData[] = [];

      if (!fs.existsSync(this.backupDir)) {
        return results;
      }

      const dateDirs = await fs.promises.readdir(this.backupDir);

      for (const dateDir of dateDirs) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDir)) continue;

        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.lstatSync(datePath).isDirectory()) continue;

        const deviceDirs = await fs.promises.readdir(datePath);

        for (const devId of deviceDirs) {
          const devicePath = path.join(datePath, devId);
          if (!fs.existsSync(devicePath)) continue;

          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              const filePath = path.join(devicePath, file);
              const content = await fs.promises.readFile(filePath, "utf-8");
              const parsed = JSON.parse(content) as BufferUploadData;
              this.setCachedObject(
                this.buildObjectCacheKey(
                  parsed.deviceId || devId,
                  parsed.timestamp,
                ),
                parsed,
              );
              results.push(parsed);
            }
          }
        }
      }

      results.sort((a, b) => a.timestamp - b.timestamp);

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
   * Retrieve backup data grouped by device.
   */
  public async getBufferDataByDevice(
    room: string,
    recordId: number,
  ): Promise<Map<string, BufferUploadData[]>> {
    try {
      const deviceMap = new Map<string, BufferUploadData[]>();
      const allData = await this.getBufferData(room, recordId);

      for (const data of allData) {
        const devId = data.deviceId || "unknown-device";
        if (!deviceMap.has(devId)) {
          deviceMap.set(devId, []);
        }
        deviceMap.get(devId)!.push(data);
      }

      return deviceMap;
    } catch (error) {
      this.logger.error(`[BACKUP_GET_BY_DEVICE_ERROR] ${error}`);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Session continuity
  // -------------------------------------------------------------------------

  /**
   * Retrieve previous session records for a specific device.
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

      const currentDomain = new URL(url).hostname;
      const matchingData = deviceData.filter((d) => {
        if (!d.url) return false;
        try {
          const dataDomain = new URL(d.url).hostname;
          return dataDomain === currentDomain;
        } catch {
          return false;
        }
      });

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
   * Load previous session events for session continuity.
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

      const latestSession = previousSessions[0];
      const allEvents: Array<{
        method: string;
        params: unknown;
        timestamp: number;
      }> = [];

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
        allEvents.push(...latestSession.bufferData);
      }

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
   * Clean up memory on session end.
   */
  public cleanupSession(
    deviceId: string,
    room?: string,
    recordId?: number,
  ): void {
    for (const [key] of this.memoryCache) {
      if (key.includes(deviceId)) {
        this.memoryCache.delete(key);
      }
    }

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

  // -------------------------------------------------------------------------
  // File listing
  // -------------------------------------------------------------------------

  /**
   * List backup files with date-based indexing support.
   */
  public async listBackupFiles(options?: {
    deviceId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    beforeDate?: string;
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

      const effectiveLimit =
        options?.beforeDate && !options?.limit ? 10 : options?.limit;

      const dateDirs = await fs.promises.readdir(this.backupDir);
      const validDateDirs = dateDirs
        .filter((dir) => /^\d{4}-\d{2}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a));

      for (const dateDir of validDateDirs) {
        if (options?.date && dateDir !== options.date) continue;
        if (options?.startDate && dateDir < options.startDate) continue;
        if (options?.endDate && dateDir > options.endDate) continue;
        if (options?.beforeDate && dateDir >= options.beforeDate) continue;

        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.lstatSync(datePath).isDirectory()) continue;

        const deviceDirs = await fs.promises.readdir(datePath);

        for (const devId of deviceDirs) {
          if (options?.deviceId && devId !== options.deviceId) continue;

          const devicePath = path.join(datePath, devId);
          if (!fs.lstatSync(devicePath).isDirectory()) continue;

          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              const filePath = path.join(devicePath, file);
              const stat = await fs.promises.stat(filePath);

              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              const timestamp = fileMatch[1];

              let eventCount = undefined;
              let url = undefined;
              try {
                const content = await fs.promises.readFile(filePath, "utf-8");
                const fileData = JSON.parse(content) as BufferUploadData;
                eventCount = fileData.bufferData?.length;
                url = fileData.url;
              } catch {
                // Ignore file read failures
              }

              backupFiles.push({
                fileName: file,
                room: "N/A",
                recordId: "N/A",
                deviceId: devId,
                timestamp,
                date: dateDir,
                size: stat.size,
                eventCount,
                url,
              });
            }
          }
        }

        if (
          effectiveLimit &&
          backupFiles.length >= effectiveLimit &&
          !options?.date
        ) {
          break;
        }
      }

      backupFiles.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

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
