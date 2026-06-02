import { Injectable, Logger } from '@nestjs/common';

import { assertSafePublicUrl } from '../utils/url-safety';

/**
 * Maximum response size accepted when fetching a remote image (10 MB).
 * Anything larger is rejected to prevent memory exhaustion via attacker-
 * controlled URLs.
 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * 이미지 URL을 Base64 문자열로 변환하는 서비스.
 */
@Injectable()
export class ImageBase64Service {
  private readonly logger = new Logger(ImageBase64Service.name);

  /**
   * 주어진 URL의 이미지를 가져와 Base64 문자열로 변환한다.
   * 요청 실패 또는 변환 오류 시 빈 문자열을 반환한다.
   * URL이 비공개/루프백 IP 또는 허용되지 않은 스킴인 경우 거부한다 (SSRF 방어).
   * @param url - 변환할 이미지의 URL
   * @returns Base64로 인코딩된 이미지 문자열 또는 빈 문자열
   */
  public async imageToBase64(url: string): Promise<string> {
    try {
      assertSafePublicUrl(url);
    } catch (error) {
      this.logger.warn(
        `Refusing to fetch image (unsafe URL): ${error instanceof Error ? error.message : error}`,
      );
      return '';
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) {
        this.logger.warn(`Failed to fetch image: ${response.status} ${url}`);
        return '';
      }

      const contentLengthHeader = response.headers?.get?.('content-length');
      if (contentLengthHeader) {
        const declared = Number(contentLengthHeader);
        if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
          this.logger.warn(
            `Refusing to fetch image (declared size ${declared} exceeds ${MAX_IMAGE_BYTES}): ${url}`,
          );
          return '';
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
        this.logger.warn(
          `Refusing to decode image (body size ${arrayBuffer.byteLength} exceeds ${MAX_IMAGE_BYTES}): ${url}`,
        );
        return '';
      }

      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      this.logger.warn(
        `Failed to convert image to base64: ${error instanceof Error ? error.message : error}`,
      );
      return '';
    }
  }
}
