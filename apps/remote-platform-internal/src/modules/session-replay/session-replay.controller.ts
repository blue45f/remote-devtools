import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

import {
  SessionReplayService,
  ReplayEvent,
  SessionConsoleEntry,
  SessionMetadata,
  SessionNetworkEntry,
  SessionPreview,
} from './session-replay.service';

@ApiTags('Session Replay')
@Controller('api/session-replay')
export class SessionReplayController {
  private readonly logger = new Logger(SessionReplayController.name);

  constructor(private readonly sessionReplayService: SessionReplayService) {}

  /**
   * GET /api/session-replay/sessions
   * Retrieve a paginated list of sessions, optionally filtered by room.
   */
  @ApiResponse({ status: 200, description: 'Paginated list of session metadata' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('sessions')
  public async getSessions(
    @Query(
      'limit',
      new ParseIntPipe({
        optional: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    limit?: number,
    @Query(
      'offset',
      new ParseIntPipe({
        optional: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    offset?: number,
    @Query('room') room?: string,
  ): Promise<SessionMetadata[]> {
    return this.sessionReplayService.getSessions(limit || 20, offset || 0, room);
  }

  /**
   * GET /api/session-replay/sessions/:id
   * Retrieve metadata for a specific session.
   */
  @ApiResponse({ status: 200, description: 'Session metadata for the given ID' })
  @ApiResponse({ status: 400, description: 'Invalid session ID format' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('sessions/:id')
  public async getSessionMetadata(@Param('id', ParseIntPipe) id: number): Promise<SessionMetadata> {
    return this.sessionReplayService.getSessionMetadata(id);
  }

  /**
   * GET /api/session-replay/sessions/:id/preview
   * Returns the most recent screenPreview snapshot (head + body HTML) so
   * the frontend can render a thumbnail iframe of the captured page.
   */
  @ApiResponse({ status: 200, description: 'Screen preview snapshot or null if none' })
  @ApiResponse({ status: 400, description: 'Invalid session ID format' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('sessions/:id/preview')
  public async getSessionPreview(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SessionPreview | null> {
    return this.sessionReplayService.getSessionPreview(id);
  }

  /**
   * GET /api/session-replay/sessions/:id/events
   * Retrieve all events for a session. Supports DB record IDs, S3 session IDs,
   * and direct S3 file paths.
   */
  @ApiResponse({ status: 200, description: 'Replay events for the session' })
  @ApiResponse({ status: 400, description: 'Invalid session ID or parameters' })
  @ApiResponse({ status: 404, description: 'Session or S3 file not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('sessions/:id/events')
  public async getSessionEvents(
    @Param('id') id: string,
    @Query('startTime', new ParseIntPipe({ optional: true }))
    startTime?: number,
    @Query('endTime', new ParseIntPipe({ optional: true })) endTime?: number,
    @Query('s3FilePath') s3FilePath?: string,
  ): Promise<ReplayEvent[]> {
    this.logger.log(`[SESSION_REPLAY_API] Request params: id=${id}, s3FilePath=${s3FilePath}`);

    // S3 file path takes priority when specified directly
    if (s3FilePath) {
      this.logger.log(`[SESSION_REPLAY_API] Loading from S3 file path: ${s3FilePath}`);
      return this.sessionReplayService.loadSessionFromS3File(s3FilePath);
    }

    // S3 session ID format
    if (id.startsWith('s3-')) {
      this.logger.log(`[SESSION_REPLAY_API] Loading S3 session by ID: ${id}`);
      return this.sessionReplayService.loadSession(id);
    }

    // Standard DB record ID
    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      throw new BadRequestException(`Invalid session ID: ${id}`);
    }

    if (startTime && endTime) {
      return this.sessionReplayService.loadSessionChunk(recordId, startTime, endTime);
    }

    return this.sessionReplayService.loadSession(recordId);
  }

  /**
   * GET /api/session-replay/sessions/:id/network
   *
   * Returns the captured network rows for a DB session as a flat list
   * suitable for a Network panel — URL, method, status, type, mimeType,
   * timestamp, and optional response body. S3-backed sessions return an
   * empty array.
   */
  @ApiResponse({ status: 200, description: 'Captured network entries for the session' })
  @ApiResponse({ status: 400, description: 'Invalid session ID format' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('sessions/:id/network')
  public async getSessionNetwork(@Param('id') id: string): Promise<SessionNetworkEntry[]> {
    return this.sessionReplayService.getSessionNetwork(id);
  }

  /**
   * GET /api/session-replay/sessions/:id/console
   *
   * Returns the captured runtime / console events for a DB session as a
   * flat list — one entry per CDP `Runtime.consoleAPICalled` /
   * `Runtime.exceptionThrown` event with level + text + source.
   */
  @ApiResponse({ status: 200, description: 'Captured console events for the session' })
  @ApiResponse({ status: 400, description: 'Invalid session ID format' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('sessions/:id/console')
  public async getSessionConsole(@Param('id') id: string): Promise<SessionConsoleEntry[]> {
    return this.sessionReplayService.getSessionConsole(id);
  }
}
