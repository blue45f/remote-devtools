import * as path from "path";

import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import { RecordService } from "@remote-platform/core";
import { S3Service } from "../s3/s3.service";

import { WebviewGateway } from "./webview.gateway"; // Gateway에서 방 목록을 가져오기 위해 import

@Controller("rooms")
export class WebviewController {
  constructor(
    private readonly webviewGateway: WebviewGateway,
    private readonly recordService: RecordService,
    private readonly s3Service: S3Service,
  ) {}

  // GET /rooms - 방 목록 반환
  @Get()
  public getRoomList(): { id: number; name: string }[] {
    return this.webviewGateway.getLiveRoomList();
  }

  @Get("record")
  public async getRecordRoomList(): Promise<{ id: number; name: string }[]> {
    return (await this.recordService.findAll()).map((record) => ({
      id: record.id,
      name: record.name,
    }));
  }

  // GET /rooms/backups - S3 백업 목록 조회 (파일 내용 포함 - 느림)
  @Get("backups")
  public async getBackupList(
    @Query("deviceId") deviceId?: string,
    @Query("date") date?: string, // YYYY-MM-DD
    @Query("startDate") startDate?: string, // YYYY-MM-DD
    @Query("endDate") endDate?: string, // YYYY-MM-DD
    @Query("beforeDate") beforeDate?: string, // YYYY-MM-DD - 해당 날짜 이전의 백업들만 조회
    @Query("limit") limitParam?: string, // 숫자를 문자열로 받음
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
    const limit = limitParam ? parseInt(limitParam) : undefined;

    return this.s3Service.listBackupFiles({
      deviceId,
      date,
      startDate,
      endDate,
      beforeDate,
      limit,
    });
  }

  // GET /rooms/backups-light - S3 백업 목록 경량 조회 (파일 내용 읽지 않음 - 빠름)
  @Get("backups-light")
  public async getBackupListLight(
    @Query("deviceId") deviceId?: string,
    @Query("date") date?: string, // YYYY-MM-DD
    @Query("startDate") startDate?: string, // YYYY-MM-DD
    @Query("endDate") endDate?: string, // YYYY-MM-DD
    @Query("beforeDate") beforeDate?: string, // YYYY-MM-DD - 해당 날짜 이전의 백업들만 조회
    @Query("limit") limitParam?: string, // 숫자를 문자열로 받음
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
    const limit = limitParam ? parseInt(limitParam) : undefined;

    return this.s3Service.listBackupFilesLight({
      deviceId,
      date,
      startDate,
      endDate,
      beforeDate,
      limit,
    });
  }

  // POST /rooms/backup-urls - 선택된 백업 파일들에서 URL 정보 추출
  @Get("backup-urls")
  public async getBackupUrls(@Query("filePaths") filePaths?: string) {
    if (!filePaths) {
      return { urlByFilePath: {}, primaryUrl: null };
    }

    const pathArray = filePaths.split(",").filter((path) => path.trim());
    return this.s3Service.getUrlsFromSelectedFiles(pathArray);
  }

  // GET /rooms/backup-viewer - 백업 뷰어 UI
  @Get("backup-viewer")
  public getBackupViewer(@Res() res: Response): void {
    res.sendFile(path.join(__dirname, "backup-viewer.html"));
  }

  // GET /rooms/record/:recordId/info - 특정 기록의 정보 조회
  @Get("record/:recordId/info")
  public async getRecordInfo(@Param("recordId") recordId: string) {
    const record = await this.recordService.findOne(Number(recordId));
    if (!record) {
      return { error: "Record not found" };
    }

    // deviceId 우선순위: record.deviceId > commonInfo.deviceId > 'unknown-device'
    const deviceId = record.deviceId || "unknown-device";
    const url = record.url || "";

    // 한국시간 기준으로 생성 날짜 변환 (UTC+9)
    const createdDate = record.createdAt
      ? new Date(new Date(record.createdAt).getTime() + 9 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      : new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

    return {
      id: record.id,
      name: record.name,
      deviceId,
      url,
      date: createdDate,
      createdAt: record.createdAt, // 원본 timestamp도 함께 반환
    };
  }

  // GET /rooms/record/:recordId/previous - 같은 deviceId의 이전 기록들 조회 (DB + S3 백업)
  @Get("record/:recordId/previous")
  public async getPreviousRecords(@Param("recordId") recordId: string) {
    const currentRecord = await this.recordService.findOne(Number(recordId));
    if (!currentRecord) {
      return { error: "Record not found" };
    }

    const deviceId = currentRecord.deviceId || "unknown-device";
    const currentTimestamp = currentRecord.createdAt.getTime(); // 현재 녹화 세션의 실제 생성 시간
    const currentDate = currentRecord.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD

    const allPreviousRecords = [];

    // S3 백업에서만 같은 deviceId의 이전 기록들 조회 (DB 조회 제외)
    // Fetching S3 backup data for deviceId: ${deviceId}
    try {
      // S3에서만 조회 (같은 날짜, 같은 deviceId, 현재 시간 이전)
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
          id: `s3-${sanitizedDeviceId}-${s3Record.timestamp}-${index}`, // S3 백업용 고유 ID
          name: `S3 백업 (${s3Date.toLocaleString()})`,
          deviceId: s3Record.deviceId,
          url: s3Record.url,
          title: s3Record.title,
          timestamp: orderingTimestamp,
          source: "s3",
          date: s3Date.toISOString().split("T")[0],
          room: s3Record.room,
          bufferDataLength: s3Record.bufferData?.length || 0,
          fileName: `session_${s3Record.timestamp}.json`, // fileName 추가
          filePath: `${s3Date.toISOString().split("T")[0]}/${s3Record.deviceId}/session_${s3Record.timestamp}.json`, // filePath 추가
        });
      });
    } catch (error) {
      console.log(error);
    }

    // 3. 모든 기록을 timestamp 기준으로 정렬 (최신순)
    allPreviousRecords.sort((a, b) => b.timestamp - a.timestamp);

    // Total records: ${allPreviousRecords.length} (S3: ${s3Count})

    return allPreviousRecords;
  }
}
