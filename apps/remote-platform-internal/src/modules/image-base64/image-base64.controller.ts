import { Controller, Get, Query } from "@nestjs/common";

import { ImageBase64Service } from "@remote-platform/core";

@Controller("image")
export class ImageBase64Controller {
  constructor(private readonly imageService: ImageBase64Service) {}

  @Get("image_base64")
  public async getImageBase64(
    @Query("url") url: string,
  ): Promise<{ base64: string }> {
    try {
      const base64 = await this.imageService.imageToBase64(url);
      return { base64 };
    } catch {
      return { base64: "" };
    }
  }
}
