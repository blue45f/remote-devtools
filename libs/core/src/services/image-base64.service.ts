import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ImageBase64Service {
  private readonly logger = new Logger(ImageBase64Service.name);

  public async imageToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Failed to fetch image: ${response.status} ${url}`);
        return "";
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer.toString("base64");
    } catch (error) {
      this.logger.warn(
        `Failed to convert image to base64: ${error instanceof Error ? error.message : error}`,
      );
      return "";
    }
  }
}
