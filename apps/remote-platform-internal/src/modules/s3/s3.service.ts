import * as fs from "fs";
import * as path from "path";

import {
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import {
  BaseS3Service,
  BufferUploadData,
} from "@remote-platform/core";

export { BufferUploadData };

@Injectable()
export class S3Service extends BaseS3Service {
  protected readonly logger = new Logger(S3Service.name);

  // S3 backup playback cache (keyed by selected file paths)
  private s3PlaybackCache = new Map<string, BufferUploadData[]>();
  private maxS3CacheSize = 500; // Max 500 file path combinations cached

  constructor() {
    super();
    this.logInit();
  }

  /**
   * Save data depending on environment (beta: S3, dev: local file)
   */
  public async saveBufferData(data: BufferUploadData): Promise<void> {
    try {
      if (this.isRemoteStorageEnabled) {
        // Beta environment: upload to S3
        await this.uploadToS3(data);
      } else {
        // Dev environment: save to local file
        await this.saveToLocalFile(data);
        this.logger.log(`[DEV_MODE] Local file save mode`);
      }
    } catch (error) {
      this.logger.error(`[SAVE_BUFFER_ERROR] ${error}`);
      throw error;
    }
  }

  /**
   * Retrieve backup data from S3 (in beta environment)
   */
  public async getS3BackupData(
    deviceId: string,
    beforeTimestamp?: number,
    targetDate?: string,
  ): Promise<BufferUploadData[]> {
    if (this.isRemoteStorageEnabled) {
      // Beta environment: query from S3
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
      // Dev environment: query from local files
      if (!deviceId) {
        return this.getBufferData("", undefined);
      }
      return this.getBufferDataByDeviceId(deviceId);
    }
  }

  /**
   * Retrieve backup data from S3 cloud storage.
   * Overrides base: uses regex key parsing, objectEntries sorting, S3_PREVIOUS_LIMIT env var.
   */
  protected override async getS3BackupFromCloud(
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
   * Save to local file.
   * Overrides base: uses UTC date instead of KST.
   */
  protected override async saveToLocalFile(
    data: BufferUploadData,
  ): Promise<string> {
    const date = new Date(data.timestamp).toISOString().split("T")[0];
    const deviceId = data.deviceId || "unknown-device";
    const fileName = `session_${data.timestamp}.json`;

    const dirPath = path.join(this.backupDir, date, deviceId);
    const filePath = path.join(dirPath, fileName);

    // Create directory
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Save file
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    this.logger.log(`[LOCAL_SAVED] ${filePath}`);

    return filePath;
  }

  /**
   * Upload to S3.
   * Overrides base: uses UTC date.
   */
  protected override async uploadToS3(
    data: BufferUploadData,
  ): Promise<string> {
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

    return s3Key;
  }

  /**
   * Retrieve backup data by device ID (new directory structure only).
   */
  public async getBufferDataByDeviceId(
    deviceId: string,
    room?: string,
    recordId?: number,
  ): Promise<BufferUploadData[]> {
    try {
      const results: BufferUploadData[] = [];

      // Search in new structure: date/deviceId/session_timestamp.json
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

              // Check if using new structure (bufferChunks present)
              if (rawData.bufferChunks) {
                // Convert new structure to legacy format
                const convertedData: BufferUploadData = {
                  room: rawData.room,
                  recordId: rawData.recordId,
                  deviceId: rawData.deviceId,
                  url: rawData.url,
                  userAgent: rawData.userAgent,
                  timestamp: rawData.sessionStartTime || rawData.timestamp,
                  bufferData: [],
                };

                // Merge all chunk events into a single array
                for (const chunk of rawData.bufferChunks) {
                  if (chunk.events && Array.isArray(chunk.events)) {
                    convertedData.bufferData.push(...chunk.events);
                  }
                }

                // Optional filtering
                if (
                  !room ||
                  !recordId ||
                  (convertedData.room === room &&
                    convertedData.recordId === recordId)
                ) {
                  results.push(convertedData);
                }
              } else {
                // Use legacy structure as-is
                const data = rawData as BufferUploadData;

                // Optional filtering
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

      // Sort by timestamp descending
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
   * Retrieve backed-up buffer data (new directory structure only).
   */
  public async getBufferData(
    room?: string,
    recordId?: number,
  ): Promise<BufferUploadData[]> {
    try {
      const results: BufferUploadData[] = [];

      // Scan date-based directories (YYYY-MM-DD/deviceId/session_timestamp.json)
      if (!fs.existsSync(this.backupDir)) {
        return results;
      }

      const dateDirs = await fs.promises.readdir(this.backupDir);

      for (const dateDir of dateDirs) {
        // Check date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDir)) continue;

        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.lstatSync(datePath).isDirectory()) continue;

        const deviceDirs = await fs.promises.readdir(datePath);

        for (const deviceId of deviceDirs) {
          const devicePath = path.join(datePath, deviceId);
          if (!fs.existsSync(devicePath)) continue;

          // Read files directly from deviceId directory
          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              // Extract timestamp from filename (session_timestamp.json)
              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              const filePath = path.join(devicePath, file);
              try {
                const content = await fs.promises.readFile(filePath, "utf-8");
                const rawData = JSON.parse(content);

                // Check if using new structure (bufferChunks present)
                if (rawData.bufferChunks) {
                  // Convert new structure to legacy format
                  const convertedData: BufferUploadData = {
                    room: rawData.room,
                    recordId: rawData.recordId,
                    deviceId: rawData.deviceId || deviceId,
                    url: rawData.url,
                    userAgent: rawData.userAgent,
                    timestamp: rawData.sessionStartTime || rawData.timestamp,
                    bufferData: [],
                  };

                  // Merge all chunk events into a single array
                  for (const chunk of rawData.bufferChunks) {
                    if (chunk.events && Array.isArray(chunk.events)) {
                      convertedData.bufferData.push(...chunk.events);
                    }
                  }

                  // Optional filtering
                  if (
                    !room ||
                    !recordId ||
                    (convertedData.room === room &&
                      convertedData.recordId === recordId)
                  ) {
                    results.push(convertedData);
                  }
                } else {
                  // Use legacy structure as-is
                  const data = rawData as BufferUploadData;

                  // Optional filtering
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

      // Sort by timestamp descending
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
   * Retrieve all backup data grouped by device.
   */
  public async getAllBackupDataByDevice(
    room?: string,
    recordId?: number,
  ): Promise<Map<string, BufferUploadData[]>> {
    try {
      const deviceMap = new Map<string, BufferUploadData[]>();

      // Search in new structure: date/deviceId/session_timestamp.json
      if (!fs.existsSync(this.backupDir)) {
        return deviceMap;
      }

      const allItems = await fs.promises.readdir(this.backupDir);
      const dateDirs = allItems
        .filter((dir) => /^\d{4}-\d{2}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a));

      // Scan all dates and devices
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

                // Check if using new structure (bufferChunks present)
                if (rawData.bufferChunks) {
                  // Convert new structure to legacy format
                  processedData = {
                    room: rawData.room,
                    recordId: rawData.recordId,
                    deviceId: rawData.deviceId || deviceId,
                    url: rawData.url,
                    userAgent: rawData.userAgent,
                    timestamp: rawData.sessionStartTime || rawData.timestamp,
                    bufferData: [],
                  };

                  // Merge all chunk events into a single array
                  for (const chunk of rawData.bufferChunks) {
                    if (chunk.events && Array.isArray(chunk.events)) {
                      processedData.bufferData.push(...chunk.events);
                    }
                  }
                } else {
                  // Use legacy structure as-is
                  processedData = rawData as BufferUploadData;
                }

                // Optional filtering (only when room and recordId are specified)
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

      // Sort each device's data by timestamp descending (newest first)
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
   * Retrieve backup data grouped by device (backward-compatible wrapper).
   */
  public async getBufferDataByDevice(
    room?: string,
    recordId?: number,
  ): Promise<Map<string, BufferUploadData[]>> {
    // Delegates to the new method
    return this.getAllBackupDataByDevice(room, recordId);
  }

  /**
   * Convert backup data to database format.
   */
  public convertToDbFormat(bufferData: BufferUploadData): Array<{
    protocol: unknown;
    timestamp: number;
    domain: string;
  }> {
    return bufferData.bufferData.map((item) => {
      // Extract domain from method name
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
   * List backup files with date-based indexing support.
   */
  public async listBackupFiles(options?: {
    deviceId?: string;
    date?: string; // YYYY-MM-DD
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    beforeDate?: string; // YYYY-MM-DD - only return backups before this date
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

      // Default limit to 10 when beforeDate is set (historical lookup)
      const effectiveLimit =
        options?.beforeDate && !options?.limit ? 10 : options?.limit;

      const dateDirs = await fs.promises.readdir(this.backupDir);
      const validDateDirs = dateDirs
        .filter((dir) => /^\d{4}-\d{2}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a)); // newest date first

      for (const dateDir of validDateDirs) {
        // Date filtering
        if (options?.date && dateDir !== options.date) continue;
        if (options?.startDate && dateDir < options.startDate) continue;
        if (options?.endDate && dateDir > options.endDate) continue;
        if (options?.beforeDate && dateDir >= options.beforeDate) continue; // before this date only

        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.lstatSync(datePath).isDirectory()) continue;

        const deviceDirs = await fs.promises.readdir(datePath);

        for (const deviceId of deviceDirs) {
          // Filter by deviceId
          if (options?.deviceId && deviceId !== options.deviceId) continue;

          const devicePath = path.join(datePath, deviceId);
          if (!fs.lstatSync(devicePath).isDirectory()) continue;

          // Read files directly from deviceId directory (room folder removed)
          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              const filePath = path.join(devicePath, file);
              const stat = await fs.promises.stat(filePath);

              // Extract timestamp from filename (session_timestamp.json)
              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              const timestamp = fileMatch[1];

              // Extract eventCount and URL from file contents
              let eventCount = undefined;
              let url = undefined;
              try {
                const content = await fs.promises.readFile(filePath, "utf-8");
                const data = JSON.parse(content) as BufferUploadData;
                eventCount = data.bufferData?.length;
                url = data.url;
              } catch {
                // Ignore file read failures
              }

              backupFiles.push({
                fileName: file,
                room: "N/A", // room folder removed
                recordId: "N/A", // recordId removed from filename
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

        // Check limit (when a specific date is set, fetch all files for that date)
        if (
          effectiveLimit &&
          backupFiles.length >= effectiveLimit &&
          !options?.date
        ) {
          break;
        }
      }

      // Sort by timestamp descending (newest first)
      backupFiles.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

      // Apply limit
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
   * Extract URL information from selected files (on-demand lookup).
   */
  public async getUrlsFromSelectedFiles(filePaths: string[]): Promise<{
    urlByFilePath: Record<string, string>;
    primaryUrl?: string;
  }> {
    const urlByFilePath: Record<string, string> = {};
    let primaryUrl: string | undefined;

    try {
      if (this.isRemoteStorageEnabled) {
        // Beta/production: fetch from S3
        primaryUrl = await this.getUrlsFromS3(
          filePaths,
          urlByFilePath,
          primaryUrl,
        );
      } else {
        // Development: fetch from local files
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
   * Extract URL information from files stored in S3.
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
          // Fall back to raw value on decode failure
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
   * Extract URL information from local files.
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
            // Use the first valid URL as the primary URL
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
   * Lightweight backup file listing (supports both legacy and new structure).
   */
  public async listBackupFilesLight(options?: {
    deviceId?: string;
    date?: string; // YYYY-MM-DD
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
    beforeDate?: string; // YYYY-MM-DD - only return backups before this date
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
      filePath: string; // relative path
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

      // Default limit to 10 when beforeDate is set (historical lookup)
      const effectiveLimit =
        options?.beforeDate && !options?.limit ? 10 : options?.limit;

      const allItems = await fs.promises.readdir(this.backupDir);

      // Process date directories only (new structure)
      const dateDirs = allItems
        .filter((dir) => /^\d{4}-\d{2}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a));

      // New structure: YYYY-MM-DD/deviceId/session_timestamp.json
      for (const dateDir of dateDirs) {
        // Date filtering
        if (options?.date && dateDir !== options.date) continue;
        if (options?.startDate && dateDir < options.startDate) continue;
        if (options?.endDate && dateDir > options.endDate) continue;
        if (options?.beforeDate && dateDir >= options.beforeDate) continue; // before this date only

        const datePath = path.join(this.backupDir, dateDir);
        if (!fs.lstatSync(datePath).isDirectory()) continue;

        const deviceDirs = await fs.promises.readdir(datePath);

        for (const deviceId of deviceDirs) {
          // Filter by deviceId
          if (options?.deviceId && deviceId !== options.deviceId) continue;

          const devicePath = path.join(datePath, deviceId);
          if (!fs.lstatSync(devicePath).isDirectory()) continue;

          // Read files directly from deviceId directory (room folder removed)
          const files = await fs.promises.readdir(devicePath);

          for (const file of files) {
            if (file.endsWith(".json")) {
              const filePath = path.join(devicePath, file);
              const stat = await fs.promises.stat(filePath);

              // Extract timestamp from filename (does not read file contents)
              const fileMatch = file.match(/session_(\d+)\.json/);
              if (!fileMatch) continue;

              const timestamp = fileMatch[1];

              // Build relative path (room removed)
              const relativeFilePath = `${dateDir}/${deviceId}/${file}`;

              backupFiles.push({
                fileName: file,
                room: `Backup-${backupFiles.length + 1}`, // simple sequential number
                recordId: `backup-${timestamp}`, // backup-specific ID
                deviceId,
                timestamp,
                date: dateDir,
                size: stat.size,
                filePath: relativeFilePath, // relative path
              });
            }
          }
        }

        // Check limit (when a specific date is set, fetch all files for that date)
        if (
          effectiveLimit &&
          backupFiles.length >= effectiveLimit &&
          !options?.date
        ) {
          break;
        }
      }

      // Sort by timestamp descending (newest first)
      backupFiles.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

      // Apply limit
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
   * Retrieve S3 backup data by direct file paths (supports both legacy and new structure).
   */
  public async getS3BackupByPaths(
    filePaths: string[],
  ): Promise<BufferUploadData[]> {
    // Sort file paths to build a deterministic cache key
    const sortedPaths = [...filePaths].sort();
    const cacheKey = sortedPaths.join("|"); // pipe-delimited

    // Check cache
    if (this.s3PlaybackCache.has(cacheKey)) {
      this.logger.log(`[S3_DIRECT_CACHE_HIT] ${sortedPaths.length} files`);
      return this.s3PlaybackCache.get(cacheKey);
    }

    const results: BufferUploadData[] = [];

    try {
      if (this.isRemoteStorageEnabled) {
        // Beta/production: fetch from S3
        for (const relativePath of filePaths) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET || "remote-debug-tools-s3",
              Key: `backups/${relativePath}`, // add backups/ prefix
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
        // Development: fetch from local files
        for (const relativePath of filePaths) {
          const fullPath = path.join(this.backupDir, relativePath);

          if (fs.existsSync(fullPath)) {
            try {
              const content = await fs.promises.readFile(fullPath, "utf-8");
              const rawData = JSON.parse(content);

              // Convert new structure (bufferChunks) to legacy format
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

      // Sort by timestamp descending
      results.sort((a, b) => b.timestamp - a.timestamp);

      // Cache by selected file combination
      this.s3PlaybackCache.set(cacheKey, results);

      // Enforce cache size limit
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
   * S3 backup playback (filter to records before the current timestamp only).
   */
  public async getS3BackupForPlayback(
    room: string,
    recordId: number,
    deviceId: string,
    date: string,
    currentTimestamp?: number, // current recording session timestamp (ms)
    recordService?: any, // Record service for looking up creation time from DB
  ): Promise<BufferUploadData[]> {
    // Look up the actual creation time of the current recording session
    if (!currentTimestamp) {
      // Try to extract timestamp from room name (for Buffer mode)
      const roomTimestampMatch = room.match(
        /(?:Record|Live|Buffer)-(?:\w+-)?(\d+)/,
      );
      if (roomTimestampMatch) {
        currentTimestamp = parseInt(roomTimestampMatch[1]);
        this.logger.log(
          `[S3_TIMESTAMP_EXTRACTED] Room: ${room} → Current timestamp: ${currentTimestamp}`,
        );
      } else if (recordService && recordId) {
        // Look up the actual creation time from DB
        try {
          const record = await recordService.findOne(recordId);
          if (record && record.createdAt) {
            currentTimestamp = record.createdAt.getTime(); // Convert Date to milliseconds
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
        currentTimestamp = Date.now(); // fallback: current time
      }
    }

    const cacheKey = `${room}_${recordId}_${deviceId}_${date}_${currentTimestamp}`;

    // Check cache
    if (this.s3PlaybackCache.has(cacheKey)) {
      this.logger.log(`[S3_CACHE_HIT] ${cacheKey}`);
      return this.s3PlaybackCache.get(cacheKey);
    }

    try {
      const results: BufferUploadData[] = [];

      // Extract date from current recording session (KST; search only within the same date folder)
      const currentDate = new Date(currentTimestamp + 9 * 60 * 60 * 1000); // UTC+9 (KST)
      const targetDateDir = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD

      this.logger.log(`[S3_CURRENT_RECORD] 🎯 Analyzing current record:`);
      this.logger.log(`  ⏰ Input timestamp: ${currentTimestamp}`);
      this.logger.log(`  📅 Converted date: ${currentDate.toISOString()}`);
      this.logger.log(`  📁 Target folder: ${targetDateDir}`);
      this.logger.log(
        `[S3_PREVIOUS_RECORDS] 🔍 Will search for records BEFORE ${currentTimestamp} in folder ${targetDateDir}/${deviceId}`,
      );

      // Search for previous records only within the same date folder
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

          // Filter to records before the current timestamp only
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
            continue; // exclude records after the current timestamp
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

            // Convert new structure (bufferChunks) to legacy format
            let convertedData: BufferUploadData;

            if (rawData.bufferChunks && Array.isArray(rawData.bufferChunks)) {
              // New structure: merge all chunk events into a single array
              const allEvents = rawData.bufferChunks.flatMap(
                (chunk: any) => chunk.events || [],
              );

              convertedData = {
                room: rawData.room,
                recordId: rawData.recordId,
                deviceId: rawData.deviceId,
                url: rawData.url,
                userAgent: rawData.userAgent,
                bufferData: allEvents, // converted event array
                timestamp: rawData.sessionStartTime || rawData.timestamp,
                date: rawData.date,
                sessionStartTime: rawData.sessionStartTime,
              };

              this.logger.log(
                `[S3_DATA_CONVERTED] ${file}: ${rawData.bufferChunks.length} chunks → ${allEvents.length} events`,
              );
            } else if (rawData.bufferData) {
              // Legacy structure: use as-is
              convertedData = rawData as BufferUploadData;
            } else {
              // Missing or invalid data structure
              this.logger.warn(
                `[S3_INVALID_STRUCTURE] ${filePath}: No bufferData or bufferChunks found`,
              );
              continue;
            }

            // Collect previous records only (same date, same device)
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

      // Pre-sort state log
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

      // Sort by timestamp descending (most recent previous record first)
      results.sort((a, b) => b.timestamp - a.timestamp);

      // Post-sort state log
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

      // Store in cache
      this.s3PlaybackCache.set(cacheKey, results);

      // Enforce cache size limit
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
   * Save buffer data to file.
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

      // Use KST-based date (fall back to current date if not provided)
      const targetDate = date || new Date().toISOString().split("T")[0];

      // Save path: backups/YYYY-MM-DD/deviceId/session_timestamp.json
      const devicePath = path.join(this.backupDir, targetDate, deviceId);

      console.log(`[BUFFER_SAVE_DEBUG] Target path: ${devicePath}`);

      // Create directory
      if (!fs.existsSync(devicePath)) {
        console.log(`[BUFFER_SAVE_DEBUG] Creating directory: ${devicePath}`);
        fs.mkdirSync(devicePath, { recursive: true });
      }

      // Generate unique filename from timestamp (different timestamp per flush)
      const fileName = `session_${timestamp}.json`;
      const filePath = path.join(devicePath, fileName);

      console.log(`[BUFFER_SAVE_DEBUG] Saving to file: ${filePath}`);
      console.log(
        `[BUFFER_SAVE_DEBUG] File exists before save: ${fs.existsSync(filePath)}`,
      );

      // Warn if file already exists (will be overwritten)
      if (fs.existsSync(filePath)) {
        const existingSize = fs.statSync(filePath).size;
        console.warn(
          `[BUFFER_SAVE_DEBUG] File already exists! Size: ${existingSize} bytes, will be overwritten`,
        );
      }

      // Write file
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(bufferData, null, 2),
        "utf-8",
      );

      // Verify the file was actually created
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
