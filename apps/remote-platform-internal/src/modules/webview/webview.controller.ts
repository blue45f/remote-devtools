import * as path from "path";

import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";

import { RecordService } from "@remote-platform/core";
import { S3Service } from "../s3/s3.service";

import { WebviewGateway } from "./webview.gateway"; // Import Gateway to retrieve session list

@Controller("sessions")
export class WebviewController {
  private readonly logger = new Logger(WebviewController.name);
  constructor(
    private readonly webviewGateway: WebviewGateway,
    private readonly recordService: RecordService,
    private readonly s3Service: S3Service,
  ) {}

  // GET /sessions - Return session list
  @Get()
  public getSessionList(): { id: number; name: string }[] {
    return this.webviewGateway.getLiveRoomList();
  }

  @Get("record")
  public async getRecordSessionList(): Promise<
    {
      id: number;
      name: string;
      url?: string;
      deviceId?: string;
      duration?: string | number;
      recordMode?: boolean;
      timestamp?: Date;
    }[]
  > {
    return (await this.recordService.findAll()).map((record) => ({
      id: record.id,
      name: record.name,
      url: record.url || undefined,
      deviceId: record.deviceId || undefined,
      duration: record.duration || undefined,
      recordMode: record.recordMode,
      timestamp: record.timestamp,
    }));
  }

  // GET /sessions/backups - List S3 backups (includes file content - slower)
  @Get("backups")
  public async getBackupList(
    @Query("deviceId") deviceId?: string,
    @Query("date") date?: string, // YYYY-MM-DD
    @Query("startDate") startDate?: string, // YYYY-MM-DD
    @Query("endDate") endDate?: string, // YYYY-MM-DD
    @Query("beforeDate") beforeDate?: string, // YYYY-MM-DD - Only return backups before this date
    @Query("limit") limitParam?: string, // Number received as string
  ): Promise<
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
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    if (limit !== undefined && isNaN(limit)) {
      throw new BadRequestException("Invalid limit parameter");
    }

    return this.s3Service.listBackupFiles({
      deviceId,
      date,
      startDate,
      endDate,
      beforeDate,
      limit,
    });
  }

  // GET /sessions/backups-light - Lightweight S3 backup listing (no file content reading - faster)
  @Get("backups-light")
  public async getBackupListLight(
    @Query("deviceId") deviceId?: string,
    @Query("date") date?: string, // YYYY-MM-DD
    @Query("startDate") startDate?: string, // YYYY-MM-DD
    @Query("endDate") endDate?: string, // YYYY-MM-DD
    @Query("beforeDate") beforeDate?: string, // YYYY-MM-DD - Only return backups before this date
    @Query("limit") limitParam?: string, // Number received as string
  ): Promise<
    Array<{
      fileName: string;
      room: string;
      recordId: string;
      deviceId: string;
      timestamp: string;
      date: string;
      size: number;
      filePath: string;
    }>
  > {
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    if (limit !== undefined && isNaN(limit)) {
      throw new BadRequestException("Invalid limit parameter");
    }

    return this.s3Service.listBackupFilesLight({
      deviceId,
      date,
      startDate,
      endDate,
      beforeDate,
      limit,
    });
  }

  // GET /sessions/backup-urls - Extract URL information from selected backup files
  @Get("backup-urls")
  public async getBackupUrls(@Query("filePaths") filePaths?: string) {
    if (!filePaths) {
      return { urlByFilePath: {}, primaryUrl: null };
    }

    const pathArray = filePaths.split(",").filter((path) => path.trim());
    return this.s3Service.getUrlsFromSelectedFiles(pathArray);
  }

  // GET /sessions/backup-viewer - Backup viewer UI
  @Get("backup-viewer")
  public getBackupViewer(@Res() res: Response): void {
    res.sendFile(path.join(__dirname, "backup-viewer.html"));
  }

  // GET /sessions/record/:recordId/info - Retrieve info for a specific record
  @Get("record/:recordId/info")
  public async getRecordInfo(@Param("recordId") recordId: string) {
    const id = Number(recordId);
    if (isNaN(id)) {
      throw new BadRequestException("Invalid recordId parameter");
    }
    const record = await this.recordService.findOne(id);
    if (!record) {
      throw new NotFoundException("Record not found");
    }

    // deviceId priority: record.deviceId > commonInfo.deviceId > 'unknown-device'
    const deviceId = record.deviceId || "unknown-device";
    const url = record.url || "";

    // Convert creation date to local timezone
    const { getLocalDateString } = require("@remote-platform/constants");
    const createdDate = record.createdAt
      ? getLocalDateString(new Date(record.createdAt).getTime())
      : getLocalDateString();

    return {
      id: record.id,
      name: record.name,
      deviceId,
      url,
      date: createdDate,
      createdAt: record.createdAt, // Also return the original timestamp
    };
  }

  // GET /sessions/record/:recordId/previous - Retrieve previous records for the same deviceId (S3 backups)
  @Get("record/:recordId/previous")
  public async getPreviousRecords(@Param("recordId") recordId: string) {
    const id = Number(recordId);
    if (isNaN(id)) {
      throw new BadRequestException("Invalid recordId parameter");
    }
    const currentRecord = await this.recordService.findOne(id);
    if (!currentRecord) {
      throw new NotFoundException("Record not found");
    }

    const deviceId = currentRecord.deviceId || "unknown-device";
    const currentTimestamp = currentRecord.createdAt.getTime(); // Actual creation time of the current recording session
    const currentDate = currentRecord.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD

    const allPreviousRecords = [];

    // Query previous records with the same deviceId from S3 backups only (no DB query)
    // Fetching S3 backup data for deviceId: ${deviceId}
    try {
      // Query S3 only (same date, same deviceId, before current timestamp)
      const s3Records = await this.s3Service.getS3BackupData(
        deviceId,
        currentTimestamp,
        currentDate,
      );

      // Found ${s3Records.length} S3 backup records

      s3Records.forEach((s3Record, index) => {
        const s3Date = new Date(s3Record.timestamp);
        // S3 Record: ${s3Date.toISOString()}

        const sanitizedDeviceId = encodeURIComponent(
          s3Record.deviceId || "unknown-device",
        );
        const orderingTimestamp =
          s3Record.sessionStartTime ?? s3Record.timestamp;

        allPreviousRecords.push({
          id: `s3-${sanitizedDeviceId}-${s3Record.timestamp}-${index}`, // Unique ID for S3 backup
          name: `S3 Backup (${s3Date.toLocaleString()})`,
          deviceId: s3Record.deviceId,
          url: s3Record.url,
          title: s3Record.title,
          timestamp: orderingTimestamp,
          source: "s3",
          date: s3Date.toISOString().split("T")[0],
          room: s3Record.room,
          bufferDataLength: s3Record.bufferData?.length || 0,
          fileName: `session_${s3Record.timestamp}.json`,
          filePath: `${s3Date.toISOString().split("T")[0]}/${s3Record.deviceId}/session_${s3Record.timestamp}.json`,
        });
      });
    } catch (error) {
      this.logger.error(`Failed to fetch S3 records: ${error}`);
    }

    // 3. Sort all records by timestamp (newest first)
    allPreviousRecords.sort((a, b) => b.timestamp - a.timestamp);

    // Total records: ${allPreviousRecords.length} (S3: ${s3Count})

    return allPreviousRecords;
  }
}
