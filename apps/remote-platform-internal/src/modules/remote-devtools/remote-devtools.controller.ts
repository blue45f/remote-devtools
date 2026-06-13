import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';

import { RemoteCommandDto } from './dto/remote-command.dto';
import { RemoteDevToolsService } from './remote-devtools.service';

import type { RemoteEvent, RemoteSession } from './remote-devtools.types';

/**
 * Remote DevTools live console API. Adapts recorded/live CDP sessions into the
 * session/event/command shape the unified client console consumes. Protected by
 * the same optional AuthGuard as the rest of /sessions.
 */
@ApiTags('Remote DevTools')
@UseGuards(AuthGuard)
@Controller('api/remote-devtools')
export class RemoteDevToolsController {
  constructor(private readonly service: RemoteDevToolsService) {}

  @Get('sessions')
  @ApiOperation({ summary: '원격 DevTools 세션 목록' })
  @ApiResponse({ status: 200, description: 'RemoteSession[]' })
  public getSessions(@Query('orgId') orgId?: string): Promise<RemoteSession[]> {
    return this.service.getSessions(orgId ?? null);
  }

  @Get('sessions/:id/events')
  @ApiOperation({ summary: '세션 이벤트 조회' })
  @ApiResponse({ status: 200, description: 'RemoteEvent[]' })
  @ApiResponse({ status: 404, description: 'Unknown session' })
  public getEvents(
    @Param('id') id: string,
    @Query('orgId') orgId?: string,
  ): Promise<RemoteEvent[]> {
    return this.service.getEvents(id, orgId ?? null);
  }

  @Post('sessions/:id/commands')
  @ApiOperation({ summary: '세션 제어 커맨드 전송' })
  @ApiResponse({ status: 201, description: 'Command acknowledged' })
  @ApiResponse({ status: 404, description: 'Unknown session' })
  public sendCommand(
    @Param('id') id: string,
    @Body() dto: RemoteCommandDto,
  ): Promise<{ ok: true }> {
    return this.service.sendCommand(id, dto);
  }

  @Post('sessions')
  @ApiOperation({ summary: '새 세션 생성(플레이스홀더)' })
  @ApiResponse({ status: 201, description: 'RemoteSession' })
  public createSession(): RemoteSession {
    return this.service.createSession();
  }
}
