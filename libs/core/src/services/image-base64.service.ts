import { Injectable, Logger } from "@nestjs/common";

/**
 * 이미지 URL을 Base64 문자열로 변환하는 서비스.
 */
@Injectable()
export class ImageBase64Service {
  private readonly logger = new Logger(ImageBase64Service.name);

  /**
   * 주어진 URL의 이미지를 가져와 Base64 문자열로 변환한다.
   * 요청 실패 또는 변환 오류 시 빈 문자열을 반환한다.
   * @param url - 변환할 이미지의 URL
   * @returns Base64로 인코딩된 이미지 문자열 또는 빈 문자열
   */
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
