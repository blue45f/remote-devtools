import * as path from 'path';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { getLocalDateString } from '@remote-platform/constants';
import { RecordService, ReplayCommentService } from '@remote-platform/core';

import { Auth } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { S3Service } from '../s3/s3.service';

import { WebviewGateway } from './webview.gateway'; // Import Gateway to retrieve session list

import type { AuthClaims } from '../auth/auth.service';
import type { Response } from 'express';

const MAX_TAG_LENGTH = 24;
const MAX_TAGS_PER_RECORD = 16;
const MAX_COMMENT_BODY_LENGTH = 2000;
const MAX_NOTE_LENGTH = 4000;
const MAX_COMMENT_AUTHOR_LENGTH = 80;

function normaliseTags(input: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_TAGS_PER_RECORD) break;
  }
  return out;
}

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(AuthGuard)
export class WebviewController {
  private readonly logger = new Logger(WebviewController.name);
  constructor(
    private readonly webviewGateway: WebviewGateway,
    private readonly recordService: RecordService,
    private readonly replayCommentService: ReplayCommentService,
    private readonly s3Service: S3Service,
  ) {}

  // GET /sessions - Return session list
  @ApiResponse({ status: 200, description: 'Active live debugging room list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  public getSessionList(): { id: number; name: string }[] {
    return this.webviewGateway.getLiveRoomList();
  }

  /**
   * GET /sessions/record
   *
   * Optional query params:
   *   q          partial match on name + url (case-insensitive)
   *   deviceId   exact deviceId filter
   *   recordMode "true" / "false" — defaults to both
   *   orgId      tenant scope (multi-tenant deployments)
   *   limit      page size (1–200, default 50)
   *   cursor     opaque ISO timestamp from a prior response
   *
   * Response:
   *   { rows: [...], nextCursor: string | null }
   *
   * For backwards compatibility, if no query params are present the response
   * is wrapped as a bare array so existing clients keep working.
   */
  @ApiResponse({ status: 200, description: 'Paginated recorded session list' })
  @ApiResponse({ status: 400, description: 'Invalid query parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('record')
  public async getRecordSessionList(
    @Auth() auth: AuthClaims | null,
    @Query('q') q?: string,
    @Query('deviceId') deviceId?: string,
    @Query('recordMode') recordMode?: string,
    @Query('orgId') orgIdParam?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const noFilters = !q && !deviceId && !recordMode && !orgIdParam && !limit && !cursor;

    const parsedRecordMode =
      recordMode === 'true' ? true : recordMode === 'false' ? false : undefined;

    const limitNum = limit ? Number(limit) : undefined;
    if (limit && (Number.isNaN(limitNum) || (limitNum ?? 0) < 1)) {
      throw new BadRequestException('Invalid limit');
    }

    // Multi-tenant scoping: when the caller is authenticated, force-filter by
    // their org claim — even if they passed `?orgId=` explicitly. When auth is
    // disabled (self-host) the explicit param still works and NULL passes
    // through, which keeps the existing single-tenant behaviour.
    const orgId = auth?.org ?? orgIdParam;

    const { rows, nextCursor } = await this.recordService.findPaginated({
      q,
      deviceId,
      recordMode: parsedRecordMode,
      orgId,
      limit: limitNum,
      cursor,
    });

    const items = rows.map((record) => ({
      id: record.id,
      name: record.name,
      url: record.url || undefined,
      deviceId: record.deviceId || undefined,
      duration: record.duration || undefined,
      recordMode: record.recordMode,
      timestamp: record.timestamp,
      userAgent: record.userAgent || undefined,
      tags: record.tags ?? [],
      // Lean boolean only — the full note text stays on the detail endpoint.
      hasNote: !!(record.note && record.note.trim().length > 0),
    }));

    if (noFilters) return items; // back-compat
    return { rows: items, nextCursor };
  }

  // GET /sessions/backups - List S3 backups (includes file content - slower)
  @ApiResponse({ status: 200, description: 'S3 backup list with event counts' })
  @ApiResponse({ status: 400, description: 'Invalid limit parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'S3 service error' })
  @Get('backups')
  public async getBackupList(
    @Query('deviceId') deviceId?: string,
    @Query('date') date?: string, // YYYY-MM-DD
    @Query('startDate') startDate?: string, // YYYY-MM-DD
    @Query('endDate') endDate?: string, // YYYY-MM-DD
    @Query('beforeDate') beforeDate?: string, // YYYY-MM-DD - Only return backups before this date
    @Query('limit') limitParam?: string, // Number received as string
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
      throw new BadRequestException('Invalid limit parameter');
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
  @ApiResponse({ status: 200, description: 'Lightweight S3 backup metadata list' })
  @ApiResponse({ status: 400, description: 'Invalid limit parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'S3 service error' })
  @Get('backups-light')
  public async getBackupListLight(
    @Query('deviceId') deviceId?: string,
    @Query('date') date?: string, // YYYY-MM-DD
    @Query('startDate') startDate?: string, // YYYY-MM-DD
    @Query('endDate') endDate?: string, // YYYY-MM-DD
    @Query('beforeDate') beforeDate?: string, // YYYY-MM-DD - Only return backups before this date
    @Query('limit') limitParam?: string, // Number received as string
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
      throw new BadRequestException('Invalid limit parameter');
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
  @ApiResponse({ status: 200, description: 'Returns URL map extracted from selected backup files' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('backup-urls')
  public async getBackupUrls(@Query('filePaths') filePaths?: string) {
    if (!filePaths) {
      return { urlByFilePath: {}, primaryUrl: null };
    }

    const pathArray = filePaths.split(',').filter((path) => path.trim());
    return this.s3Service.getUrlsFromSelectedFiles(pathArray);
  }

  // GET /sessions/backup-viewer - Backup viewer UI
  @ApiResponse({ status: 200, description: 'Serves the backup viewer HTML page' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('backup-viewer')
  public getBackupViewer(@Res() res: Response): void {
    res.sendFile(path.join(__dirname, 'backup-viewer.html'));
  }

  // GET /sessions/record/:recordId/info - Retrieve info for a specific record
  @ApiResponse({ status: 200, description: 'Returns metadata for the specified record' })
  @ApiResponse({ status: 400, description: 'Invalid recordId parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @Get('record/:recordId/info')
  public async getRecordInfo(@Param('recordId') recordId: string) {
    const id = Number(recordId);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid recordId parameter');
    }
    const record = await this.recordService.findOne(id);
    if (!record) {
      throw new NotFoundException('Record not found');
    }

    // deviceId priority: record.deviceId > commonInfo.deviceId > 'unknown-device'
    const deviceId = record.deviceId || 'unknown-device';
    const url = record.url || '';

    // Convert creation date to local timezone
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

  /**
   * GET /sessions/record/tags
   *
   * Returns the full sorted list of unique tags ever applied to records
   * in scope. Powers the autosuggest dropdown on the SessionDetail
   * tags editor.
   */
  @ApiResponse({
    status: 200,
    description: 'Returns sorted list of all unique record tags in scope',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('record/tags')
  public async listAllRecordTags(@Auth() auth: AuthClaims | null): Promise<string[]> {
    return this.recordService.findAllTags(auth?.org ?? null);
  }

  /**
   * PUT /sessions/record/:recordId/tags
   *
   * Replace the tag set on a record. The body shape is `{ tags: string[] }`
   * and the server normalises each entry (trim, drop empties, dedupe,
   * cap at 24 chars × 16 tags) before saving.
   */
  @ApiResponse({
    status: 200,
    description: 'Tag set replaced successfully; returns updated id and tags',
  })
  @ApiResponse({ status: 400, description: 'Invalid recordId or tags payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @Put('record/:recordId/tags')
  public async putRecordTags(
    @Param('recordId') recordId: string,
    @Body() body: { tags?: unknown },
  ): Promise<{ id: number; tags: string[] }> {
    const id = Number(recordId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid recordId parameter');
    }
    if (!Array.isArray(body?.tags)) {
      throw new BadRequestException('body.tags must be an array of strings');
    }

    const normalised = normaliseTags(body.tags);

    const updated = await this.recordService.replaceTags(id, normalised);
    if (!updated) {
      throw new NotFoundException(`Record ${id} not found`);
    }
    return { id: updated.id, tags: updated.tags };
  }

  /**
   * PATCH /sessions/record/:recordId/note
   *
   * Replace the free-form note on a record. Body shape is `{ note: string }`.
   * The server trims and caps at MAX_NOTE_LENGTH; an empty result clears the
   * note (stored as NULL).
   */
  @ApiResponse({
    status: 200,
    description: 'Note updated successfully; returns updated id and note',
  })
  @ApiResponse({ status: 400, description: 'Invalid recordId or note payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @Patch('record/:recordId/note')
  public async patchRecordNote(
    @Param('recordId') recordId: string,
    @Body() body: { note?: unknown },
  ): Promise<{ id: number; note: string | null }> {
    const id = Number(recordId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid recordId parameter');
    }
    if (body?.note !== undefined && body?.note !== null && typeof body?.note !== 'string') {
      throw new BadRequestException('body.note must be a string');
    }
    const note =
      typeof body?.note === 'string' ? body.note.trim().slice(0, MAX_NOTE_LENGTH) || null : null;

    const updated = await this.recordService.updateNote(id, note);
    if (!updated) {
      throw new NotFoundException(`Record ${id} not found`);
    }
    return { id: updated.id, note: updated.note ?? null };
  }

  /**
   * GET /sessions/record/:recordId/comments
   * List all comments on a record's replay, sorted by timestamp_ms ASC
   * (so they appear in playback order).
   */
  @ApiResponse({
    status: 200,
    description: 'Returns comments for the record sorted by timestamp ascending',
  })
  @ApiResponse({ status: 400, description: 'Invalid recordId parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('record/:recordId/comments')
  public async getRecordComments(@Param('recordId') recordId: string) {
    const id = this.parseRecordId(recordId);
    const rows = await this.replayCommentService.findByRecordId(id);
    return rows.map((c) => ({
      id: c.id,
      timestampMs: c.timestampMs,
      body: c.body,
      author: c.author ?? null,
      createdAt: c.createdAt,
      resolved: c.resolved ?? false,
    }));
  }

  /**
   * POST /sessions/record/:recordId/comments
   * Body: { timestampMs: number; body: string; author?: string }
   * Creates a new comment anchored at `timestampMs` on the replay timeline.
   */
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully; returns the new comment',
  })
  @ApiResponse({ status: 400, description: 'Invalid recordId, timestampMs, or body payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @Post('record/:recordId/comments')
  public async postRecordComment(
    @Auth() auth: AuthClaims | null,
    @Param('recordId') recordId: string,
    @Body() body: { timestampMs?: unknown; body?: unknown; author?: unknown },
  ) {
    const id = this.parseRecordId(recordId);
    const ts = Number(body?.timestampMs);
    if (!Number.isFinite(ts) || ts < 0) {
      throw new BadRequestException('timestampMs must be a non-negative number');
    }
    const text =
      typeof body?.body === 'string' ? body.body.trim().slice(0, MAX_COMMENT_BODY_LENGTH) : '';
    if (!text) {
      throw new BadRequestException('body must be a non-empty string');
    }
    const author =
      typeof body?.author === 'string'
        ? body.author.trim().slice(0, MAX_COMMENT_AUTHOR_LENGTH) || null
        : null;

    const record = await this.recordService.findOne(id);
    if (!record) {
      throw new NotFoundException(`Record ${id} not found`);
    }

    const saved = await this.replayCommentService.create({
      recordId: id,
      timestampMs: Math.floor(ts),
      body: text,
      author,
      orgId: auth?.org ?? null,
    });

    return {
      id: saved.id,
      timestampMs: saved.timestampMs,
      body: saved.body,
      author: saved.author,
      createdAt: saved.createdAt,
      resolved: saved.resolved ?? false,
    };
  }

  /**
   * PATCH /sessions/record/:recordId/comments/:commentId
   * Body: { body: string }
   * Updates the comment's text. Author and timestampMs are immutable.
   */
  @ApiResponse({
    status: 200,
    description: 'Comment body updated successfully; returns the updated comment',
  })
  @ApiResponse({ status: 400, description: 'Invalid recordId, commentId, or body payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found on record' })
  @Patch('record/:recordId/comments/:commentId')
  public async patchRecordComment(
    @Param('recordId') recordId: string,
    @Param('commentId') commentId: string,
    @Body() body: { body?: unknown },
  ) {
    const id = this.parseRecordId(recordId);
    const cId = Number(commentId);
    if (!Number.isInteger(cId) || cId <= 0) {
      throw new BadRequestException('Invalid commentId parameter');
    }
    const text =
      typeof body?.body === 'string' ? body.body.trim().slice(0, MAX_COMMENT_BODY_LENGTH) : '';
    if (!text) {
      throw new BadRequestException('body must be a non-empty string');
    }

    const updated = await this.replayCommentService.updateBody(cId, id, text);
    if (!updated) {
      throw new NotFoundException(`Comment ${cId} not found on record ${id}`);
    }

    return {
      id: updated.id,
      timestampMs: updated.timestampMs,
      body: updated.body,
      author: updated.author,
      createdAt: updated.createdAt,
      resolved: updated.resolved ?? false,
    };
  }

  /**
   * PATCH /sessions/record/:recordId/comments/:commentId/resolve
   * Body: { resolved: boolean }
   * Marks a shared annotation as addressed (or reopens it) for triage.
   */
  @ApiResponse({
    status: 200,
    description: 'Comment resolved state updated; returns the updated comment',
  })
  @ApiResponse({ status: 400, description: 'Invalid recordId, commentId, or resolved payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found on record' })
  @Patch('record/:recordId/comments/:commentId/resolve')
  public async patchRecordCommentResolved(
    @Param('recordId') recordId: string,
    @Param('commentId') commentId: string,
    @Body() body: { resolved?: unknown },
  ) {
    const id = this.parseRecordId(recordId);
    const cId = Number(commentId);
    if (!Number.isInteger(cId) || cId <= 0) {
      throw new BadRequestException('Invalid commentId parameter');
    }
    if (typeof body?.resolved !== 'boolean') {
      throw new BadRequestException('body.resolved must be a boolean');
    }

    const updated = await this.replayCommentService.setResolved(cId, id, body.resolved);
    if (!updated) {
      throw new NotFoundException(`Comment ${cId} not found on record ${id}`);
    }

    return {
      id: updated.id,
      timestampMs: updated.timestampMs,
      body: updated.body,
      author: updated.author,
      createdAt: updated.createdAt,
      resolved: updated.resolved ?? false,
    };
  }

  /**
   * DELETE /sessions/record/:recordId/comments/:commentId
   * Removes one comment. 404 if the comment doesn't exist on that record.
   */
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid recordId or commentId parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found on record' })
  @Delete('record/:recordId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteRecordComment(
    @Param('recordId') recordId: string,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    const id = this.parseRecordId(recordId);
    const cId = Number(commentId);
    if (!Number.isInteger(cId) || cId <= 0) {
      throw new BadRequestException('Invalid commentId parameter');
    }
    const deleted = await this.replayCommentService.delete(cId, id);
    if (!deleted) {
      throw new NotFoundException(`Comment ${cId} not found on record ${id}`);
    }
  }

  private parseRecordId(recordId: string): number {
    const id = Number(recordId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid recordId parameter');
    }
    return id;
  }

  // GET /sessions/record/:recordId/previous - Retrieve previous records for the same deviceId (S3 backups)
  @ApiResponse({
    status: 200,
    description: 'Returns previous S3 backup sessions for the same device, sorted newest first',
  })
  @ApiResponse({ status: 400, description: 'Invalid recordId parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @Get('record/:recordId/previous')
  public async getPreviousRecords(@Param('recordId') recordId: string) {
    const id = Number(recordId);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid recordId parameter');
    }
    const currentRecord = await this.recordService.findOne(id);
    if (!currentRecord) {
      throw new NotFoundException('Record not found');
    }

    const deviceId = currentRecord.deviceId || 'unknown-device';
    const currentTimestamp = currentRecord.createdAt.getTime(); // Actual creation time of the current recording session
    const currentDate = currentRecord.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

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

        const sanitizedDeviceId = encodeURIComponent(s3Record.deviceId || 'unknown-device');
        const orderingTimestamp = s3Record.sessionStartTime ?? s3Record.timestamp;

        allPreviousRecords.push({
          id: `s3-${sanitizedDeviceId}-${s3Record.timestamp}-${index}`, // Unique ID for S3 backup
          name: `S3 Backup (${s3Date.toLocaleString()})`,
          deviceId: s3Record.deviceId,
          url: s3Record.url,
          title: s3Record.title,
          timestamp: orderingTimestamp,
          source: 's3',
          date: s3Date.toISOString().split('T')[0],
          room: s3Record.room,
          bufferDataLength: s3Record.bufferData?.length || 0,
          fileName: `session_${s3Record.timestamp}.json`,
          filePath: `${s3Date.toISOString().split('T')[0]}/${s3Record.deviceId}/session_${s3Record.timestamp}.json`,
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
