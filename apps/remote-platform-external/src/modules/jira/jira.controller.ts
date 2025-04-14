import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { JiraService } from "./jira.service";

/**
 * JIRA 연동 컨트롤러
 * 피그마 → External → Internal → Workflow 순서로 요청 전달
 */
@Controller("jira")
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  /**
   * JIRA 이슈에 이미지 업로드 - Internal server로 바이패스
   * 피그마 플러그인 → External(여기) → Internal → Workflow
   */
  @Post("issues/:issueId/image")
  @UseInterceptors(
    FileInterceptor("image", {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  public async uploadImageToJira(
    @Param("issueId") issueId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException("이미지 파일이 필요합니다");
    }

    try {
      console.log(`[External] JIRA 이미지 업로드 요청: ${issueId}`);

      // 단순히 Internal server로 바이패스
      const result = await this.jiraService.uploadImageToJira(issueId, file);

      return {
        success: true,
        message: "이미지가 성공적으로 업로드되었습니다",
        data: result,
      };
    } catch (error) {
      console.error("[External] 업로드 실패:", error.message);

      if (error.response?.status) {
        throw new HttpException(
          error.response.data || error.message,
          error.response.status,
        );
      }

      throw new HttpException(
        "이미지 업로드 중 오류가 발생했습니다",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
