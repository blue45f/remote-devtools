import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";

import {
  SessionReplayService,
  ReplayEvent,
  SessionMetadata,
} from "./session-replay.service";

@ApiTags("Session Replay")
@Controller("api/session-replay")
export class SessionReplayController {
  private readonly logger = new Logger(SessionReplayController.name);

  constructor(private readonly sessionReplayService: SessionReplayService) {}

  /**
   * GET /api/session-replay/sessions
   * Retrieve a paginated list of sessions, optionally filtered by room.
   */
  @Get("sessions")
  public async getSessions(
    @Query(
      "limit",
      new ParseIntPipe({
        optional: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    limit?: number,
    @Query(
      "offset",
      new ParseIntPipe({
        optional: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    offset?: number,
    @Query("room") room?: string,
  ): Promise<SessionMetadata[]> {
    return this.sessionReplayService.getSessions(
      limit || 20,
      offset || 0,
      room,
    );
  }

  /**
   * GET /api/session-replay/sessions/:id
   * Retrieve metadata for a specific session.
   */
  @Get("sessions/:id")
  public async getSessionMetadata(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<SessionMetadata> {
    return this.sessionReplayService.getSessionMetadata(id);
  }

  /**
   * GET /api/session-replay/sessions/:id/events
   * Retrieve all events for a session. Supports DB record IDs, S3 session IDs,
   * and direct S3 file paths.
   */
  @Get("sessions/:id/events")
  public async getSessionEvents(
    @Param("id") id: string,
    @Query("startTime", new ParseIntPipe({ optional: true }))
    startTime?: number,
    @Query("endTime", new ParseIntPipe({ optional: true })) endTime?: number,
    @Query("s3FilePath") s3FilePath?: string,
  ): Promise<ReplayEvent[]> {
    this.logger.log(
      `[SESSION_REPLAY_API] Request params: id=${id}, s3FilePath=${s3FilePath}`,
    );

    // S3 file path takes priority when specified directly
    if (s3FilePath) {
      this.logger.log(
        `[SESSION_REPLAY_API] Loading from S3 file path: ${s3FilePath}`,
      );
      return this.sessionReplayService.loadSessionFromS3File(s3FilePath);
    }

    // S3 session ID format
    if (id.startsWith("s3-")) {
      this.logger.log(`[SESSION_REPLAY_API] Loading S3 session by ID: ${id}`);
      return this.sessionReplayService.loadSession(id);
    }

    // Standard DB record ID
    const recordId = parseInt(id);
    if (isNaN(recordId)) {
      throw new BadRequestException(`Invalid session ID: ${id}`);
    }

    if (startTime && endTime) {
      return this.sessionReplayService.loadSessionChunk(
        recordId,
        startTime,
        endTime,
      );
    }

    return this.sessionReplayService.loadSession(recordId);
  }
}
