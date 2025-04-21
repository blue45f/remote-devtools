import * as fs from "fs";
import * as path from "path";

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Record, Screen } from "@remote-platform/entity";

import { S3Service } from "../s3/s3.service";

export interface ReplayEvent {
  id: number;
  event_type: string;
  protocol: any;
  timestamp: string | number;
  relativeTime?: number; // 세션 시작 기준 상대 시간 (ms)
  sequence?: number;
  isRRWeb?: boolean; // rrweb 이벤트 여부
}

export interface SessionMetadata {
  id: number;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  eventCount: number;
  hasFullSnapshot: boolean;
}

@Injectable()
export class SessionReplayService {
  constructor(
    @InjectRepository(Record)
    private recordRepository: Repository<Record>,

    @InjectRepository(Screen)
    private screenRepository: Repository<Screen>,

    private s3Service: S3Service,
  ) {}

  /**
   * 세션 목록 조회
   */
  async getSessions(
    limit = 20,
    offset = 0,
    room?: string,
  ): Promise<SessionMetadata[]> {
    if (room && room.startsWith("s3-")) {
      const s3Metadata = await this.getS3SessionMetadata(room);
      return s3Metadata ? [s3Metadata] : [];
    }

    const query = this.recordRepository
      .createQueryBuilder("record")
      .leftJoinAndSelect("record.screen", "screen")
      .select([
        "record.id",
        "record.name",
        "record.duration",
        "record.timestamp",
      ])
      .addSelect("COUNT(screen.id)", "eventCount")
      .addSelect("MIN(screen.timestamp)", "startTime")
      .addSelect("MAX(screen.timestamp)", "endTime")
      .addSelect(
        "COUNT(CASE WHEN screen.event_type = 'full_snapshot' THEN 1 END)",
        "fullSnapshotCount",
      );

    // room으로 필터링 (recordId로 전달됨)
    if (room) {
      // room이 숫자 형태의 recordId인지 확인
      const recordId = parseInt(room, 10);
      if (!isNaN(recordId)) {
        query.where("record.id = :recordId", { recordId });
      } else {
        // 숫자가 아니면 name으로 필터링 (호환성 유지)
        query.where("record.name = :room", { room });
      }
    }

    const records = await query
      .groupBy("record.id")
      .orderBy("record.timestamp", "DESC") // 최신순 정렬
      .limit(limit)
      .offset(offset)
      .getRawMany();

    return records.map((record) => ({
      id: record.record_id,
      name: record.record_name,
      duration: Number(record.record_duration || 0),
      startTime: Number(record.startTime || 0),
      endTime: Number(record.endTime || 0),
      eventCount: Number(record.eventCount || 0),
      hasFullSnapshot: Number(record.fullSnapshotCount || 0) > 0,
    }));
  }

  /**
   * 특정 세션의 모든 이벤트 로드 (DB + S3 백업 지원)
   */
  async loadSession(sessionId: string | number): Promise<ReplayEvent[]> {
    const sessionIdStr = sessionId.toString();
    console.log(`[SESSION_REPLAY_LOAD] 🎬 Loading session: ${sessionIdStr}`);

    // S3 백업 ID 인지 확인 (s3-{deviceId}-{timestamp}-{index} 또는 레거시 s3-{timestamp}-{index} 형태)
    if (sessionIdStr.startsWith("s3-")) {
      console.log(
        `[SESSION_REPLAY_LOAD] 🔵 Loading S3 session: ${sessionIdStr}`,
      );
      const s3Events = await this.loadS3SessionEvents(sessionIdStr);
      console.log(
        `[SESSION_REPLAY_LOAD] 🔵 S3 session loaded: ${s3Events.length} events`,
      );
      return s3Events;
    }

    // 기존 DB 방식
    console.log(`[SESSION_REPLAY_LOAD] 🔴 Loading DB session: ${sessionIdStr}`);
    const recordId = Number(sessionId);
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException(`Session with id ${recordId} not found`);
    }

    // SessionReplay 이벤트만 로드 (ScreenPreview 제외)
    const events = await this.screenRepository
      .createQueryBuilder("screen")
      .where("screen.recordId = :recordId", { recordId })
      .andWhere("(screen.type IS NULL OR screen.type != :previewType)", {
        previewType: "screenPreview",
      })
      .orderBy("COALESCE(screen.sequence, 0)", "ASC")
      .addOrderBy("screen.timestamp", "ASC")
      .getMany();

    if (events.length === 0) {
      return [];
    }

    // 첫 이벤트 시간을 기준으로 상대 시간 계산
    // BigInt를 사용하여 정밀도 유지
    const startTime = BigInt(events[0].timestamp.toString());

    // 버퍼링된 이벤트와 실시간 이벤트 구분을 위한 분석
    let prevTimestamp = startTime;
    let bufferEndIndex = -1;
    let maxGap = BigInt(0);

    const analyzedEvents = events.map((event, index) => {
      const eventTime = BigInt(event.timestamp.toString());
      const relativeTimeNs = eventTime - startTime;
      const relativeTimeMs = Number(relativeTimeNs / BigInt(1000000)); // 나노초 -> 밀리초

      // 이전 이벤트와의 시간 간격
      const gapNs = eventTime - prevTimestamp;
      const gapMs = Number(gapNs / BigInt(1000000));

      // 가장 큰 간격 찾기 (버퍼 -> 실시간 전환점)
      if (gapNs > maxGap && index < 100) {
        maxGap = gapNs;
        bufferEndIndex = index;
      }

      prevTimestamp = eventTime;

      // 디버깅: 처음 몇 개 이벤트와 큰 간격이 있는 이벤트 로그
      if (event.sequence <= 10 || event.sequence % 20 === 0 || gapMs > 500) {
        console.log(`[SessionReplay API] Event timing:`, {
          sequence: event.sequence,
          index,
          timestamp: event.timestamp.toString(),
          relativeTime: relativeTimeMs,
          gapFromPrevious: gapMs,
          event_type: event.event_type,
          isLikelyBuffered: index < bufferEndIndex || gapMs < 50,
        });
      }

      // rrweb 이벤트인 경우 직접 반환
      const protocol = event.protocol as any;
      if (protocol?.method === "SessionReplay.rrwebEvent") {
        const rrwebEvent = protocol.params?.event;
        return {
          id: event.id,
          event_type: event.event_type || "unknown",
          protocol: rrwebEvent || event.protocol, // rrweb 이벤트 또는 전체 protocol
          timestamp: event.timestamp.toString(),
          relativeTime: relativeTimeMs,
          sequence: event.sequence ?? 0,
          isRRWeb: true, // rrweb 이벤트 표시
        };
      }

      // 기존 형식 호환
      return {
        id: event.id,
        event_type: event.event_type || "unknown",
        protocol: event.protocol,
        timestamp: event.timestamp.toString(),
        relativeTime: relativeTimeMs,
        sequence: event.sequence ?? 0,
        isRRWeb: false,
      };
    });

    // 버퍼 구간 분석 결과 로그
    if (bufferEndIndex > 0) {
      const maxGapMs = Number(maxGap / BigInt(1000000));
      console.log(`📊 [SessionReplay API] Buffer analysis:`, {
        bufferEndIndex,
        maxGap: `${maxGapMs}ms at index ${bufferEndIndex}`,
        bufferDuration: analyzedEvents[bufferEndIndex - 1]?.relativeTime || 0,
        totalEvents: events.length,
      });
    }

    return analyzedEvents;
  }

  /**
   * S3 파일 경로로 직접 Session Replay 데이터 로드
   */
  async loadSessionFromS3File(s3FilePath: string): Promise<ReplayEvent[]> {
    try {
      // Loading Session Replay from S3: ${s3FilePath}

      const isBeta = process.env.APP_ENV === "beta";
      let sessionData: any;

      if (isBeta) {
        // Beta 환경: S3에서 조회
        // Reading from S3
        const backupData = await this.s3Service.getS3BackupByPaths([
          s3FilePath,
        ]);

        if (!backupData || backupData.length === 0) {
          // S3 file not found
          return [];
        }

        sessionData = backupData[0];
      } else {
        // 개발 환경: 로컬 파일 읽기
        const backupDir = path.join(process.cwd(), "backups");
        const fullPath = path.join(backupDir, s3FilePath);

        // Reading from local file

        if (!fs.existsSync(fullPath)) {
          // Local file not found
          return [];
        }

        const content = await fs.promises.readFile(fullPath, "utf-8");
        sessionData = JSON.parse(content);
      }

      // 새로운 구조(bufferChunks)와 기존 구조(bufferData) 모두 지원
      let allEvents = [];

      if (sessionData.bufferChunks && Array.isArray(sessionData.bufferChunks)) {
        // 새 구조: bufferChunks에서 events 추출
        // New structure: ${sessionData.bufferChunks.length} chunks
        for (const chunk of sessionData.bufferChunks) {
          if (chunk.events && Array.isArray(chunk.events)) {
            allEvents.push(...chunk.events);
          }
        }
      } else if (
        sessionData.bufferData &&
        Array.isArray(sessionData.bufferData)
      ) {
        // 기존 구조: bufferData 직접 사용
        // Legacy structure detected
        allEvents = sessionData.bufferData;
      } else {
        // No valid buffer data found
        return [];
      }

      // SessionReplay 이벤트만 필터링
      const sessionReplayEvents = allEvents.filter(
        (event) =>
          event.method &&
          (event.method.startsWith("SessionReplay.") ||
            event.method === "SessionReplay.rrwebEvent"),
      );

      // SessionReplay events: ${sessionReplayEvents.length} / Total: ${allEvents.length}

      // 필터링 확인을 위한 샘플 로그
      // Processing events...

      if (sessionReplayEvents.length === 0) {
        // No SessionReplay events found
        return [];
      }

      // 첫 이벤트 시간을 기준으로 상대 시간 계산
      const startTime = sessionReplayEvents[0].timestamp;
      // Session start time: ${new Date(startTime).toISOString()}

      // ReplayEvent 형식으로 변환
      const replayEvents: ReplayEvent[] = sessionReplayEvents.map(
        (event, index) => {
          const relativeTime = event.timestamp - startTime;

          // SessionReplay.rrwebEvent의 경우 rrweb 이벤트 직접 반환
          if (
            event.method === "SessionReplay.rrwebEvent" &&
            event.params?.event
          ) {
            return {
              id: index + 1,
              event_type: event.params.event.type?.toString() || "unknown",
              protocol: event.params.event, // rrweb 이벤트 직접 사용
              timestamp: event.timestamp,
              relativeTime,
              sequence: index + 1,
              isBuffer: false,
            };
          }

          // 기타 SessionReplay 이벤트
          return {
            id: index + 1,
            event_type: event.method.replace("SessionReplay.", ""),
            protocol: event,
            timestamp: event.timestamp,
            relativeTime,
            sequence: index + 1,
            isBuffer: false,
          };
        },
      );

      // Converted ${replayEvents.length} events
      return replayEvents;
    } catch (error) {
      throw new NotFoundException(`Failed to load S3 file: ${s3FilePath}`);
    }
  }

  /**
   * S3 백업 세션 이벤트 로드
   */
  private async loadS3SessionEvents(
    s3SessionId: string,
  ): Promise<ReplayEvent[]> {
    try {
      const parsed = this.parseS3SessionId(s3SessionId);

      if (!parsed) {
        throw new NotFoundException(
          `Invalid S3 session ID format: ${s3SessionId}`,
        );
      }

      if (parsed.format === "device") {
        const direct = await this.s3Service.getBackupByDeviceAndTimestamp(
          parsed.deviceId,
          parsed.timestamp,
        );
        if (direct) {
          console.log(
            `[S3_SESSION_REPLAY] ✅ Direct fetch for device=${parsed.deviceId}, timestamp=${parsed.timestamp} succeeded`,
          );
          return this.extractSessionReplayFromBackup(direct);
        }

        const date = new Date(parsed.timestamp).toISOString().split("T")[0];
        const fallback = await this.s3Service.getS3BackupData(
          parsed.deviceId,
          undefined,
          date,
        );

        if (fallback && fallback.length > 0) {
          const match = fallback.find(
            (item) => item.timestamp === parsed.timestamp,
          );
          if (match) {
            console.log(
              `[S3_SESSION_REPLAY] ✅ Fallback match found for device=${parsed.deviceId}`,
            );
            return this.extractSessionReplayFromBackup(match);
          }
        }

        console.warn(
          `[S3_SESSION_REPLAY] ❌ No backup found for device=${parsed.deviceId}, timestamp=${parsed.timestamp} — falling back to legacy search`,
        );
      }

      const targetTimestamp = parsed.timestamp;
      const targetDate = new Date(targetTimestamp).toISOString().split("T")[0];

      console.log(
        `[S3_SESSION_REPLAY] Loading legacy session events for timestamp: ${targetTimestamp} (${targetDate})`,
      );

      const s3BackupData = await this.s3Service.getS3BackupData(
        "",
        targetTimestamp,
        targetDate,
      );

      if (!s3BackupData || s3BackupData.length === 0) {
        console.warn(
          `[S3_SESSION_REPLAY] ❌ No S3 backup found for timestamp: ${targetTimestamp}`,
        );
        return [];
      }

      const targetBackup = s3BackupData.find(
        (backup) => backup.timestamp === targetTimestamp,
      );

      if (!targetBackup) {
        console.warn(`[S3_SESSION_REPLAY] ❌ No exact timestamp match found`);
        return [];
      }

      console.log(
        `[S3_SESSION_REPLAY] ✅ Found S3 backup for timestamp: ${targetTimestamp}`,
      );

      return this.extractSessionReplayFromBackup(targetBackup);
    } catch (error) {
      console.error(
        `[S3_SESSION_REPLAY_ERROR] Failed to load S3 session ${s3SessionId}:`,
        error,
      );
      throw new NotFoundException(`Failed to load S3 session: ${s3SessionId}`);
    }
  }

  /**
   * 세션 메타데이터 조회
   */
  async getSessionMetadata(recordId: number): Promise<SessionMetadata> {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException(`Session with id ${recordId} not found`);
    }

    const eventStats = await this.screenRepository
      .createQueryBuilder("screen")
      .where("screen.recordId = :recordId", { recordId })
      .select([
        "COUNT(*) as count",
        "MIN(timestamp) as startTime",
        "MAX(timestamp) as endTime",
      ])
      .addSelect(
        "COUNT(CASE WHEN event_type = 'full_snapshot' THEN 1 END) as fullSnapshots",
      )
      .getRawOne();

    return {
      id: record.id,
      name: record.name,
      duration: Number(record.duration || 0),
      startTime: Number(eventStats?.startTime || 0),
      endTime: Number(eventStats?.endTime || 0),
      eventCount: Number(eventStats?.count || 0),
      hasFullSnapshot: Number(eventStats?.fullSnapshots || 0) > 0,
    };
  }

  /**
   * 청크 단위로 이벤트 로드 (대용량 세션 대응)
   */
  async loadSessionChunk(
    recordId: number,
    startTime: number,
    endTime: number,
  ): Promise<ReplayEvent[]> {
    const events = await this.screenRepository
      .createQueryBuilder("screen")
      .where("screen.recordId = :recordId", { recordId })
      .andWhere("screen.timestamp >= :startTime", { startTime })
      .andWhere("screen.timestamp <= :endTime", { endTime })
      .orderBy("screen.timestamp", "ASC")
      .getMany();

    const baseTime = startTime;

    return events.map((event) => ({
      id: event.id,
      event_type: event.event_type || "unknown",
      protocol: event.protocol,
      timestamp: Number(event.timestamp),
      relativeTime: (Number(event.timestamp) - baseTime) / 1000000,
    }));
  }

  /**
   * S3 백업 데이터에서 SessionReplay 이벤트 추출
   */
  private extractSessionReplayFromBackup(backupData: any): ReplayEvent[] {
    // bufferChunks 또는 bufferData에서 이벤트 추출
    let allEvents = [];

    if (backupData.bufferChunks && Array.isArray(backupData.bufferChunks)) {
      // 새 구조: bufferChunks에서 events 추출
      for (const chunk of backupData.bufferChunks) {
        if (chunk.events && Array.isArray(chunk.events)) {
          allEvents.push(...chunk.events);
        }
      }
    } else if (backupData.bufferData && Array.isArray(backupData.bufferData)) {
      // 기존 구조: bufferData 직접 사용
      allEvents = backupData.bufferData;
    } else {
      console.warn(`[S3_SESSION_REPLAY] No valid buffer data found`);
      return [];
    }

    // SessionReplay 이벤트만 필터링
    const sessionReplayEvents = allEvents.filter(
      (event) =>
        event.method &&
        (event.method.startsWith("SessionReplay.") ||
          event.method === "SessionReplay.rrwebEvent"),
    );

    if (sessionReplayEvents.length === 0) {
      console.warn(`[S3_SESSION_REPLAY] No SessionReplay events found`);
      return [];
    }

    // 첫 이벤트 시간을 기준으로 상대 시간 계산
    const startTime = sessionReplayEvents[0].timestamp;

    // ReplayEvent 형식으로 변환
    const replayEvents: ReplayEvent[] = sessionReplayEvents.map(
      (event, index) => {
        const relativeTime = event.timestamp - startTime;

        // SessionReplay.rrwebEvent의 경우 rrweb 이벤트 직접 반환
        if (
          event.method === "SessionReplay.rrwebEvent" &&
          event.params?.event
        ) {
          return {
            id: index + 1,
            event_type: event.params.event.type?.toString() || "unknown",
            protocol: event.params.event,
            timestamp: event.timestamp,
            relativeTime,
            sequence: index + 1,
            isBuffer: false,
          };
        }

        // 기타 SessionReplay 이벤트
        return {
          id: index + 1,
          event_type: event.method.replace("SessionReplay.", ""),
          protocol: event,
          timestamp: event.timestamp,
          relativeTime,
          sequence: index + 1,
          isBuffer: false,
        };
      },
    );

    console.log(
      `[S3_SESSION_REPLAY] ✅ Extracted ${replayEvents.length} SessionReplay events from S3 backup`,
    );
    return replayEvents;
  }

  private parseS3SessionId(
    sessionId: string,
  ):
    | { format: "device"; deviceId: string; timestamp: number; index: number }
    | { format: "legacy"; timestamp: number; index: number }
    | null {
    const deviceFormat = sessionId.match(/^s3-(.+)-(\d+)-(\d+)$/);
    if (deviceFormat) {
      let deviceId = deviceFormat[1];
      try {
        deviceId = decodeURIComponent(deviceId);
      } catch (error) {
        // 디코딩 실패 시 원본 사용
      }
      return {
        format: "device",
        deviceId,
        timestamp: Number(deviceFormat[2]),
        index: Number(deviceFormat[3] || 0),
      };
    }

    const legacyFormat = sessionId.match(/^s3-(\d+)-(\d+)$/);
    if (legacyFormat) {
      return {
        format: "legacy",
        timestamp: Number(legacyFormat[1]),
        index: Number(legacyFormat[2] || 0),
      };
    }

    return null;
  }

  private async getS3SessionMetadata(
    s3SessionId: string,
  ): Promise<SessionMetadata | null> {
    const parsed = this.parseS3SessionId(s3SessionId);

    if (!parsed) {
      return null;
    }

    if (parsed.format === "device") {
      let backup = await this.s3Service.getBackupByDeviceAndTimestamp(
        parsed.deviceId,
        parsed.timestamp,
      );

      if (!backup) {
        const fallbackDate = new Date(parsed.timestamp)
          .toISOString()
          .split("T")[0];
        const deviceBackups = await this.s3Service.getS3BackupData(
          parsed.deviceId,
          undefined,
          fallbackDate,
        );
        backup = deviceBackups.find(
          (item) => item.timestamp === parsed.timestamp,
        );

        if (!backup) {
          return null;
        }
      }

      const events = this.extractSessionReplayFromBackup(backup);

      if (events.length === 0) {
        return null;
      }

      const startTimestampRaw =
        events[0]?.timestamp ?? backup.sessionStartTime ?? parsed.timestamp;
      const endTimestampRaw =
        events[events.length - 1]?.timestamp ?? startTimestampRaw;

      const startTimestamp = Number(startTimestampRaw) || parsed.timestamp;
      const endTimestamp = Number(endTimestampRaw) || startTimestamp;

      const durationMs = Math.max(endTimestamp - startTimestamp, 0);
      const durationNs = Math.trunc(durationMs * 1_000_000);
      const startTimeNs = Math.trunc(startTimestamp * 1_000_000);
      const endTimeNs = Math.trunc(endTimestamp * 1_000_000);

      const hasFullSnapshot = events.some((event) => {
        const protocol = event.protocol as any;
        if (!protocol) return false;

        if (typeof protocol.type === "number") {
          return protocol.type === 2;
        }

        const method = protocol.method || event.event_type;
        return (
          method === "SessionReplay.fullSnapshot" || method === "full_snapshot"
        );
      });

      return {
        id: parsed.timestamp,
        name: s3SessionId,
        duration: durationNs,
        startTime: startTimeNs,
        endTime: endTimeNs,
        eventCount: events.length,
        hasFullSnapshot,
      };
    }

    const targetTimestamp = parsed.timestamp;
    const targetIndex = parsed.index || 0;
    const targetDate = new Date(targetTimestamp).toISOString().split("T")[0];

    const backups = await this.s3Service.getS3BackupData(
      "",
      undefined,
      targetDate,
    );
    if (!backups || backups.length === 0) {
      return null;
    }

    const normalizedBackups = backups
      .map((backup) => ({
        backup,
        sessionStart: backup.sessionStartTime ?? backup.timestamp,
      }))
      .filter((item) => typeof item.sessionStart === "number");

    if (normalizedBackups.length === 0) {
      return null;
    }

    let targetBackup = normalizedBackups.find(
      (item) =>
        item.sessionStart === targetTimestamp ||
        item.backup.timestamp === targetTimestamp,
    )?.backup;

    if (!targetBackup) {
      const sortedBackups = [...normalizedBackups].sort(
        (a, b) => a.sessionStart - b.sessionStart,
      );
      targetBackup =
        sortedBackups[Math.min(targetIndex, sortedBackups.length - 1)]?.backup;
    }

    if (!targetBackup) {
      return null;
    }

    const events = this.extractSessionReplayFromBackup(targetBackup);
    const eventCount = events.length;

    const startTimestampRaw =
      events[0]?.timestamp ?? targetBackup.sessionStartTime ?? targetTimestamp;
    const endTimestampRaw =
      events[eventCount - 1]?.timestamp ?? startTimestampRaw;

    const startTimestamp = Number(startTimestampRaw) || targetTimestamp;
    const endTimestamp = Number(endTimestampRaw) || startTimestamp;

    const durationMs = Math.max(endTimestamp - startTimestamp, 0);
    const durationNs = Math.trunc(durationMs * 1_000_000);
    const startTimeNs = Math.trunc(startTimestamp * 1_000_000);
    const endTimeNs = Math.trunc(endTimestamp * 1_000_000);

    const hasFullSnapshot = events.some((event) => {
      const protocol = event.protocol as any;
      if (!protocol) return false;

      if (typeof protocol.type === "number") {
        return protocol.type === 2;
      }

      const method = protocol.method || event.event_type;
      return (
        method === "SessionReplay.fullSnapshot" || method === "full_snapshot"
      );
    });

    return {
      id: targetTimestamp,
      name: s3SessionId,
      duration: durationNs,
      startTime: startTimeNs,
      endTime: endTimeNs,
      eventCount,
      hasFullSnapshot,
    };
  }
}
