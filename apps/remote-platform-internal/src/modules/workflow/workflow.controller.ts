import {
  Controller,
  Get,
  Logger,
  Post,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import axios from "axios";
import * as FormData from "form-data";

/**
 * Workflow API proxy controller.
 * Jira image uploads go directly to the Jira REST API.
 * Member search uses the WORKFLOW_API_URL proxy.
 */
@Controller("workflow")
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);
  private readonly workflowAPIURL = process.env.WORKFLOW_API_URL;
  private readonly jiraHostUrl = process.env.JIRA_HOST_URL;

  /**
   * GET /workflow/members - Search internal organization members by name.
   */
  @Get("members")
  public getMembers(
    @Query("name") name: string,
  ): Promise<WorkflowResponse<MemberDTO>> {
    return axios
      .get<WorkflowResponse<MemberDTO>>(`${this.workflowAPIURL}/members`, {
        params: { name },
      })
      .then((res) => res.data);
  }

  /**
   * Upload an image to a Jira issue as an attachment (direct Jira REST API v3).
   */
  @Post("jira/issues/:issueId/image")
  @UseInterceptors(FileInterceptor("image"))
  public async uploadImageToJira(
    @Param("issueId") issueId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<unknown> {
    if (!file) {
      throw new BadRequestException("An image file is required");
    }

    const email = process.env.JIRA_API_EMAIL;
    const token = process.env.JIRA_API_TOKEN;

    if (!this.jiraHostUrl || !email || !token) {
      throw new BadRequestException(
        "Jira API credentials are not configured (JIRA_HOST_URL, JIRA_API_EMAIL, JIRA_API_TOKEN)",
      );
    }

    this.logger.log(`Uploading image to Jira issue: ${issueId}`);

    const formData = new FormData();
    formData.append("file", file.buffer, {
      filename: file.originalname || `capture-${Date.now()}.png`,
      contentType: file.mimetype,
    });

    try {
      const response = await axios.post(
        `${this.jiraHostUrl}/rest/api/3/issue/${issueId}/attachments`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
            "X-Atlassian-Token": "no-check",
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      this.logger.log(`Jira attachment uploaded for issue: ${issueId}`);
      return response.data;
    } catch (error) {
      const axiosError = error as {
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      this.logger.error(`Jira attachment error for issue ${issueId}:`, {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
      });
      throw error;
    }
  }
}

interface WorkflowResponse<T> {
  readonly code: string;
  readonly message: string;
  readonly status: string;
  readonly statusMessage: string;
  readonly data: T;
}

interface MemberDTO {
  readonly items: {
    readonly updatedAt: string;
    readonly createdAt: string;
    readonly deletedAt: string | null;
    readonly id: number;
    readonly identification: string;
    readonly birthDay: string;
    readonly name: string;
    readonly email: string;
    readonly team: string;
    readonly slackId: string;
    readonly profile: string;
    readonly gitlabId: string | null;
    readonly notionId: string | null;
    readonly notionMemoryItem: string | null;
    readonly isPartner: boolean;
    readonly hasWelcomed: boolean;
    readonly isWorking: boolean;
    readonly notification: boolean;
    readonly mention: boolean;
    readonly hasMorningAlarm: boolean;
  }[];
}
