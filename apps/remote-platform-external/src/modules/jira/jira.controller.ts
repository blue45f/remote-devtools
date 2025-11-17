/// <reference types="multer" />
import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { JiraService } from "./jira.service";

/**
 * Jira integration controller.
 * Routes: Figma plugin -> External (here) -> Internal -> Workflow
 */
@Controller("jira")
export class JiraController {
  private readonly logger = new Logger(JiraController.name);

  constructor(private readonly jiraService: JiraService) {}

  /**
   * Uploads an image to a Jira issue by proxying through the internal server.
   * Flow: Figma plugin -> External (here) -> Internal -> Workflow
   */
  @Post("issues/:issueId/image")
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  public async uploadImageToJira(
    @Param("issueId") issueId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; message: string; data: unknown }> {
    if (!file) {
      throw new BadRequestException("An image file is required");
    }

    try {
      this.logger.log(
        `[JIRA_IMAGE_UPLOAD] Uploading image for issue: ${issueId}`,
      );

      const result = await this.jiraService.uploadImageToJira(issueId, file);

      return {
        success: true,
        message: "Image uploaded successfully",
        data: result,
      };
    } catch (error: unknown) {
      const axiosError = error as {
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      this.logger.error(
        `[JIRA_IMAGE_UPLOAD] Upload failed: ${axiosError.message}`,
      );

      if (axiosError.response?.status) {
        throw new HttpException(
          axiosError.response.data || axiosError.message || "Upload failed",
          axiosError.response.status,
        );
      }

      throw new HttpException(
        "An error occurred while uploading the image",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
