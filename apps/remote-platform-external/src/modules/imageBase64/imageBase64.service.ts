import { Injectable } from "@nestjs/common";
import imageToBase64 from "image-to-base64";

@Injectable()
export class ImageBase64Service {
  public async imageToBase64(url: string): Promise<string> {
    try {
      const base64 = await imageToBase64(url); // image-to-base64 사용
      return base64;
    } catch (error) {
      // 에러 처리
      return "";
    }
  }
}
