import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PresenceService, Viewer } from './presence.service';

const MAX_CLIENT_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 80;

interface PresenceResponse {
  count: number;
  viewers: Viewer[];
}

/**
 * Live-presence endpoints for the session detail view. Clients heartbeat
 * while a session is open and read back who else is viewing it.
 */
@ApiTags('Presence')
@Controller('api/presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  /**
   * POST /api/presence/:sessionId/heartbeat
   * Body: { clientId: string; name?: string }
   * Records the caller as present and returns the live viewer list.
   */
  @Post(':sessionId/heartbeat')
  @ApiOperation({ summary: '세션 뷰어 하트비트' })
  @ApiResponse({ status: 201, description: '{ count, viewers }' })
  @ApiResponse({ status: 400, description: 'Missing or invalid sessionId / clientId' })
  public heartbeat(
    @Param('sessionId') sessionId: string,
    @Body() body: { clientId?: unknown; name?: unknown },
  ): PresenceResponse {
    const sid = (sessionId ?? '').trim();
    if (!sid) throw new BadRequestException('sessionId is required');
    const clientId =
      typeof body?.clientId === 'string' ? body.clientId.trim().slice(0, MAX_CLIENT_ID_LENGTH) : '';
    if (!clientId) throw new BadRequestException('clientId is required');
    const name =
      typeof body?.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LENGTH) || null : null;

    const viewers = this.presence.heartbeat(sid, clientId, name);
    return { count: viewers.length, viewers };
  }

  /**
   * GET /api/presence/:sessionId
   * Returns the current live viewers for a session.
   */
  @Get(':sessionId')
  @ApiOperation({ summary: '세션 뷰어 조회' })
  @ApiResponse({ status: 200, description: '{ count, viewers }' })
  @ApiResponse({ status: 400, description: 'Missing or blank sessionId' })
  public getViewers(@Param('sessionId') sessionId: string): PresenceResponse {
    const sid = (sessionId ?? '').trim();
    if (!sid) throw new BadRequestException('sessionId is required');
    const viewers = this.presence.getViewers(sid);
    return { count: viewers.length, viewers };
  }
}
