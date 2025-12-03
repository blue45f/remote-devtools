import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
} from "@nestjs/common";

import {
  SessionReplayService,
  ReplayEvent,
  SessionMetadata,
} from "./session-replay.service";

@Controller("api/session-replay")
export class SessionReplayController {
  constructor(private readonly sessionReplayService: SessionReplayService) {}

  /**
   * GET /api/session-replay/sessions
   * 세션 목록 조회
   */
  @Get("sessions")
  async getSessions(
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
   * 특정 세션 메타데이터 조회
   */
  @Get("sessions/:id")
  async getSessionMetadata(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<SessionMetadata> {
    return this.sessionReplayService.getSessionMetadata(id);
  }

  /**
   * GET /api/session-replay/sessions/:id/events
   * 세션의 모든 이벤트 조회 (DB record ID 또는 S3 session ID 지원)
   */
  @Get("sessions/:id/events")
  async getSessionEvents(
    @Param("id") id: string, // 문자열로 받아서 S3 ID 지원
    @Query("startTime", new ParseIntPipe({ optional: true }))
    startTime?: number,
    @Query("endTime", new ParseIntPipe({ optional: true })) endTime?: number,
    @Query("s3FilePath") s3FilePath?: string, // S3 파일 경로 직접 지정
  ): Promise<ReplayEvent[]> {
    console.log(
      `[SESSION_REPLAY_API] 🔍 Request params: id=${id}, s3FilePath=${s3FilePath}`,
    );

    // S3 파일 경로가 직접 지정된 경우 (우선 처리)
    if (s3FilePath) {
      console.log(
        `[SESSION_REPLAY_API] 📁 Loading from S3 file path: ${s3FilePath}`,
      );
      return this.sessionReplayService.loadSessionFromS3File(s3FilePath);
    }

    // S3 세션 ID인 경우 청크 로드 미지원 (전체 로드만)
    if (id.startsWith("s3-")) {
      console.log(`[SESSION_REPLAY_API] 🔵 Loading S3 session by ID: ${id}`);
      return this.sessionReplayService.loadSession(id);
    }

    // 기존 DB record ID 처리
    const recordId = parseInt(id);
    if (isNaN(recordId)) {
      throw new Error(`Invalid session ID: ${id}`);
    }

    if (startTime && endTime) {
      // 청크 단위 로드
      return this.sessionReplayService.loadSessionChunk(
        recordId,
        startTime,
        endTime,
      );
    }
    // 전체 이벤트 로드
    return this.sessionReplayService.loadSession(recordId);
  }
}
