import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { WebviewGateway } from './webview.gateway';

@ApiTags('Buffer')
@SkipThrottle()
@Controller('buffer')
export class BufferController {
  constructor(private readonly webviewGateway: WebviewGateway) {}

  @Post('save')
  @ApiResponse({ status: 201, description: 'Buffer save triggered successfully.' })
  @ApiResponse({ status: 400, description: 'Missing or invalid deviceId.' })
  @ApiResponse({ status: 500, description: 'Gateway or internal server error.' })
  public async saveBuffer(
    @Body()
    body: {
      deviceId?: string;
      trigger?: string;
      timestamp?: number;
      url?: string;
      title?: string;
      room?: string;
    },
  ): Promise<{ success: boolean }> {
    const deviceId = body.deviceId?.trim();

    if (!deviceId) {
      throw new BadRequestException('deviceId is required');
    }

    const success = await this.webviewGateway.triggerBufferSave(
      deviceId,
      body.trigger,
      body.title,
      body.timestamp,
      body.room,
      body.url,
    );

    return { success };
  }
}
