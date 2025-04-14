import { BadRequestException, Body, Controller, Post } from "@nestjs/common";

import { WebviewGateway } from "./webview.gateway";

@Controller("buffer")
export class BufferController {
  constructor(private readonly webviewGateway: WebviewGateway) {}

  @Post("save")
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
      throw new BadRequestException("deviceId is required");
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
