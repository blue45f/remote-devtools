import * as fs from "fs";
import * as path from "path";

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RecordEntity, ScreenEntity } from "@remote-platform/entity";

import { S3Service } from "../s3/s3.service";

export interface ReplayEvent {
  readonly id: number;
  readonly eventType: string;
  readonly protocol: unknown;
  readonly timestamp: string | number;
  readonly relativeTime?: number;
  readonly sequence?: number;
  readonly isRRWeb?: boolean;
}

export interface SessionMetadata {
  readonly id: number;
  readonly name: string;
  readonly duration: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly eventCount: number;
  readonly hasFullSnapshot: boolean;
}

interface ParsedS3SessionDevice {
  readonly format: "device";
  readonly deviceId: string;
  readonly timestamp: number;
  readonly index: number;
}

interface ParsedS3SessionLegacy {
  readonly format: "legacy";
  readonly timestamp: number;
  readonly index: number;
}

type ParsedS3Session = ParsedS3SessionDevice | ParsedS3SessionLegacy;

@Injectable()
export class SessionReplayService {
  private readonly logger = new Logger(SessionReplayService.name);

  constructor(
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,

    @InjectRepository(ScreenEntity)
    private readonly screenRepository: Repository<ScreenEntity>,

    private readonly s3Service: S3Service,
  ) {}

  /**
   * Retrieve a paginated list of sessions, optionally filtered by room (recordId or name).
   */
  public async getSessions(
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
      .leftJoinAndSelect("record.screens", "screen")
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

    if (room) {
      const recordId = parseInt(room, 10);
      if (!isNaN(recordId)) {
        query.where("record.id = :recordId", { recordId });
      } else {
        query.where("record.name = :room", { room });
      }
    }

    const records = await query
      .groupBy("record.id")
      .orderBy("record.timestamp", "DESC")
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
   * Load all events for a session (supports both DB records and S3 backups).
   */
  public async loadSession(sessionId: string | number): Promise<ReplayEvent[]> {
    const sessionIdStr = sessionId.toString();
    this.logger.log(`Loading session: ${sessionIdStr}`);

    // S3 backup session
    if (sessionIdStr.startsWith("s3-")) {
      this.logger.log(`Loading S3 session: ${sessionIdStr}`);
      const s3Events = await this.loadS3SessionEvents(sessionIdStr);
      this.logger.log(`S3 session loaded: ${s3Events.length} events`);
      return s3Events;
    }

    // Standard DB session
    this.logger.log(`Loading DB session: ${sessionIdStr}`);
    const recordId = Number(sessionId);
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException(`Session with id ${recordId} not found`);
    }

    // Load SessionReplay events only (exclude ScreenPreview)
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

    // Calculate relative times using BigInt for precision
    const startTime = BigInt(events[0].timestamp.toString());

    let prevTimestamp = startTime;
    let bufferEndIndex = -1;
    let maxGap = BigInt(0);

    const analyzedEvents = events.map((event, index) => {
      const eventTime = BigInt(event.timestamp.toString());
      const relativeTimeNs = eventTime - startTime;
      const relativeTimeMs = Number(relativeTimeNs / BigInt(1000000));

      const gapNs = eventTime - prevTimestamp;
      const gapMs = Number(gapNs / BigInt(1000000));

      // Track largest gap to identify buffer-to-realtime transition
      if (gapNs > maxGap && index < 100) {
        maxGap = gapNs;
        bufferEndIndex = index;
      }

      prevTimestamp = eventTime;

      // Log timing for first events, periodic events, and large gaps
      if (event.sequence <= 10 || event.sequence % 20 === 0 || gapMs > 500) {
        this.logger.debug(
          `Event timing: sequence=${event.sequence}, index=${index}, relativeTime=${relativeTimeMs}, gap=${gapMs}ms, type=${event.eventType}`,
        );
      }

      // Return rrweb events directly
      const protocol = event.protocol as Record<string, unknown>;
      if (protocol?.method === "SessionReplay.rrwebEvent") {
        const rrwebEvent = (protocol.params as Record<string, unknown>)?.event;
        return {
          id: event.id,
          eventType: event.eventType || "unknown",
          protocol: rrwebEvent || event.protocol,
          timestamp: event.timestamp.toString(),
          relativeTime: relativeTimeMs,
          sequence: event.sequence ?? 0,
          isRRWeb: true,
        };
      }

      return {
        id: event.id,
        eventType: event.eventType || "unknown",
        protocol: event.protocol,
        timestamp: event.timestamp.toString(),
        relativeTime: relativeTimeMs,
        sequence: event.sequence ?? 0,
        isRRWeb: false,
      };
    });

    if (bufferEndIndex > 0) {
      const maxGapMs = Number(maxGap / BigInt(1000000));
      this.logger.debug(
        `Buffer analysis: bufferEndIndex=${bufferEndIndex}, maxGap=${maxGapMs}ms, bufferDuration=${analyzedEvents[bufferEndIndex - 1]?.relativeTime || 0}ms, totalEvents=${events.length}`,
      );
    }

    return analyzedEvents;
  }

  /**
   * Load Session Replay data from a specific S3 file path.
   */
  public async loadSessionFromS3File(
    s3FilePath: string,
  ): Promise<ReplayEvent[]> {
    try {
      const isBeta = process.env.APP_ENV === "beta";
      let sessionData: Record<string, unknown>;

      if (isBeta) {
        const backupData = await this.s3Service.getS3BackupByPaths([
          s3FilePath,
        ]);

        if (!backupData || backupData.length === 0) {
          return [];
        }

        sessionData = backupData[0];
      } else {
        // Development environment: read from local file
        const backupDir = path.join(process.cwd(), "backups");
        const fullPath = path.join(backupDir, s3FilePath);

        if (!fs.existsSync(fullPath)) {
          return [];
        }

        const content = await fs.promises.readFile(fullPath, "utf-8");
        sessionData = JSON.parse(content);
      }

      const allEvents = this.extractEventsFromSessionData(sessionData);
      if (allEvents.length === 0) {
        return [];
      }

      const sessionReplayEvents = this.filterSessionReplayEvents(allEvents);
      if (sessionReplayEvents.length === 0) {
        return [];
      }

      return this.convertToReplayEvents(sessionReplayEvents);
    } catch {
      throw new NotFoundException(`Failed to load S3 file: ${s3FilePath}`);
    }
  }

  /**
   * Retrieve metadata for a specific session.
   */
  public async getSessionMetadata(recordId: number): Promise<SessionMetadata> {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException(`Session with id ${recordId} not found`);
    }

    const eventStats = await this.screenRepository
      .createQueryBuilder("screen")
      .where("screen.recordId = :recordId", { recordId })
      .select("COUNT(*)", "count")
      .addSelect("MIN(screen.timestamp)", "startTime")
      .addSelect("MAX(screen.timestamp)", "endTime")
      .addSelect(
        "COUNT(CASE WHEN screen.event_type = 'full_snapshot' THEN 1 END)",
        "fullSnapshots",
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
   * Load events for a specific time range (for large session chunked loading).
   */
  public async loadSessionChunk(
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
      eventType: event.eventType || "unknown",
      protocol: event.protocol,
      timestamp: Number(event.timestamp),
      relativeTime: (Number(event.timestamp) - baseTime) / 1000000,
    }));
  }

  /**
   * Load S3 session events by session ID.
   */
  private async loadS3SessionEvents(
    s3SessionId: string,
  ): Promise<ReplayEvent[]> {
    const parsed = this.parseS3SessionId(s3SessionId);

    if (!parsed) {
      throw new NotFoundException(
        `Invalid S3 session ID format: ${s3SessionId}`,
      );
    }

    try {
      if (parsed.format === "device") {
        const direct = await this.s3Service.getBackupByDeviceAndTimestamp(
          parsed.deviceId,
          parsed.timestamp,
        );
        if (direct) {
          this.logger.log(
            `[S3_SESSION_REPLAY] Direct fetch for device=${parsed.deviceId}, timestamp=${parsed.timestamp} succeeded`,
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
            this.logger.log(
              `[S3_SESSION_REPLAY] Fallback match found for device=${parsed.deviceId}`,
            );
            return this.extractSessionReplayFromBackup(match);
          }
        }

        this.logger.warn(
          `[S3_SESSION_REPLAY] No backup found for device=${parsed.deviceId}, timestamp=${parsed.timestamp} -- falling back to legacy search`,
        );
      }

      const targetTimestamp = parsed.timestamp;
      const targetDate = new Date(targetTimestamp).toISOString().split("T")[0];

      this.logger.log(
        `[S3_SESSION_REPLAY] Loading legacy session events for timestamp: ${targetTimestamp} (${targetDate})`,
      );

      const s3BackupData = await this.s3Service.getS3BackupData(
        "",
        targetTimestamp,
        targetDate,
      );

      if (!s3BackupData || s3BackupData.length === 0) {
        this.logger.warn(
          `[S3_SESSION_REPLAY] No S3 backup found for timestamp: ${targetTimestamp}`,
        );
        return [];
      }

      const targetBackup = s3BackupData.find(
        (backup) => backup.timestamp === targetTimestamp,
      );

      if (!targetBackup) {
        this.logger.warn(`[S3_SESSION_REPLAY] No exact timestamp match found`);
        return [];
      }

      this.logger.log(
        `[S3_SESSION_REPLAY] Found S3 backup for timestamp: ${targetTimestamp}`,
      );

      return this.extractSessionReplayFromBackup(targetBackup);
    } catch (error) {
      this.logger.error(
        `[S3_SESSION_REPLAY] Failed to load S3 session ${s3SessionId}:`,
        error,
      );
      throw new NotFoundException(`Failed to load S3 session: ${s3SessionId}`);
    }
  }

  /**
   * Extract SessionReplay events from S3 backup data.
   */
  private extractSessionReplayFromBackup(
    backupData: Record<string, unknown>,
  ): ReplayEvent[] {
    const allEvents = this.extractEventsFromSessionData(backupData);
    if (allEvents.length === 0) {
      this.logger.warn(`[S3_SESSION_REPLAY] No valid buffer data found`);
      return [];
    }

    const sessionReplayEvents = this.filterSessionReplayEvents(allEvents);
    if (sessionReplayEvents.length === 0) {
      this.logger.warn(`[S3_SESSION_REPLAY] No SessionReplay events found`);
      return [];
    }

    const replayEvents = this.convertToReplayEvents(sessionReplayEvents);

    this.logger.log(
      `[S3_SESSION_REPLAY] Extracted ${replayEvents.length} SessionReplay events from S3 backup`,
    );
    return replayEvents;
  }

  /**
   * Extract raw events from session data (supports both bufferChunks and bufferData formats).
   */
  private extractEventsFromSessionData(
    sessionData: Record<string, unknown>,
  ): Array<Record<string, unknown>> {
    const bufferChunks = sessionData.bufferChunks;
    const bufferData = sessionData.bufferData;

    if (Array.isArray(bufferChunks)) {
      const allEvents: Array<Record<string, unknown>> = [];
      for (const chunk of bufferChunks) {
        if (chunk.events && Array.isArray(chunk.events)) {
          allEvents.push(...chunk.events);
        }
      }
      return allEvents;
    }

    if (Array.isArray(bufferData)) {
      return bufferData;
    }

    return [];
  }

  /**
   * Filter events to include only SessionReplay-related events.
   */
  private filterSessionReplayEvents(
    events: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> {
    return events.filter(
      (event) =>
        event.method &&
        typeof event.method === "string" &&
        (event.method.startsWith("SessionReplay.") ||
          event.method === "SessionReplay.rrwebEvent"),
    );
  }

  /**
   * Convert raw session replay events into the ReplayEvent format.
   */
  private convertToReplayEvents(
    sessionReplayEvents: Array<Record<string, unknown>>,
  ): ReplayEvent[] {
    const startTime = sessionReplayEvents[0].timestamp as number;

    return sessionReplayEvents.map((event, index) => {
      const relativeTime = (event.timestamp as number) - startTime;

      if (
        event.method === "SessionReplay.rrwebEvent" &&
        (event.params as Record<string, unknown>)?.event
      ) {
        return {
          id: index + 1,
          eventType:
            (
              (event.params as Record<string, unknown>).event as Record<
                string,
                unknown
              >
            )?.type?.toString() || "unknown",
          protocol: (event.params as Record<string, unknown>).event,
          timestamp: event.timestamp as number,
          relativeTime,
          sequence: index + 1,
          isBuffer: false,
        };
      }

      return {
        id: index + 1,
        eventType: (event.method as string).replace("SessionReplay.", ""),
        protocol: event,
        timestamp: event.timestamp as number,
        relativeTime,
        sequence: index + 1,
        isBuffer: false,
      };
    });
  }

  /**
   * Parse an S3 session ID into its components.
   */
  private parseS3SessionId(sessionId: string): ParsedS3Session | null {
    const deviceFormat = sessionId.match(/^s3-(.+)-(\d+)-(\d+)$/);
    if (deviceFormat) {
      let deviceId = deviceFormat[1];
      try {
        deviceId = decodeURIComponent(deviceId);
      } catch {
        // Use original value if decoding fails
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

  /**
   * Retrieve S3 session metadata by session ID.
   */
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

      return this.buildS3SessionMetadata(
        s3SessionId,
        parsed.timestamp,
        events,
        backup,
      );
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

    return this.buildS3SessionMetadata(
      s3SessionId,
      targetTimestamp,
      events,
      targetBackup,
    );
  }

  /**
   * Build a SessionMetadata object from S3 backup events.
   */
  private buildS3SessionMetadata(
    sessionName: string,
    fallbackTimestamp: number,
    events: ReplayEvent[],
    backup: Record<string, unknown>,
  ): SessionMetadata | null {
    const eventCount = events.length;
    if (eventCount === 0) {
      return null;
    }

    const startTimestampRaw =
      events[0]?.timestamp ??
      (backup as Record<string, unknown>).sessionStartTime ??
      fallbackTimestamp;
    const endTimestampRaw =
      events[eventCount - 1]?.timestamp ?? startTimestampRaw;

    const startTimestamp = Number(startTimestampRaw) || fallbackTimestamp;
    const endTimestamp = Number(endTimestampRaw) || startTimestamp;

    const durationMs = Math.max(endTimestamp - startTimestamp, 0);
    const durationNs = Math.trunc(durationMs * 1_000_000);
    const startTimeNs = Math.trunc(startTimestamp * 1_000_000);
    const endTimeNs = Math.trunc(endTimestamp * 1_000_000);

    const hasFullSnapshot = events.some((event) => {
      const protocol = event.protocol as Record<string, unknown>;
      if (!protocol) return false;

      if (typeof protocol.type === "number") {
        return protocol.type === 2;
      }

      const method = (protocol.method as string) || event.eventType;
      return (
        method === "SessionReplay.fullSnapshot" || method === "full_snapshot"
      );
    });

    return {
      id: fallbackTimestamp,
      name: sessionName,
      duration: durationNs,
      startTime: startTimeNs,
      endTime: endTimeNs,
      eventCount,
      hasFullSnapshot,
    };
  }
}
