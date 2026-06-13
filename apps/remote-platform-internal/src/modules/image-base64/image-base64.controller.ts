import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImageBase64Service } from '@remote-platform/core';

@ApiTags('Image')
@Controller('image')
export class ImageBase64Controller {
  constructor(private readonly imageService: ImageBase64Service) {}

  @Get('image_base64')
  @ApiResponse({ status: 200, description: 'Returns image as base64 string.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing URL parameter.' })
  public async getImageBase64(@Query('url') url: string): Promise<{ base64: string }> {
    try {
      const base64 = await this.imageService.imageToBase64(url);
      return { base64 };
    } catch {
      return { base64: '' };
    }
  }
}
