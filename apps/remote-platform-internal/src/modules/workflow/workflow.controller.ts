import {
  Controller,
  Get,
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
 * Workflow API proxy controller
 * Configure WORKFLOW_API_URL environment variable for your organization's API
 */
@Controller("workflow")
export class WorkflowController {
  private readonly workflowAPIURL = process.env.WORKFLOW_API_URL;
  // GET /members - 사내 구성원 리스트 검색
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
   * JIRA 이슈에 이미지 업로드 - Workflow API로 바이패스
   * Internal(여기) → Workflow API
   */
  @Post("jira/issues/:issueId/image")
  @UseInterceptors(FileInterceptor("image"))
  async uploadImageToJira(
    @Param("issueId") issueId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException("이미지 파일이 필요합니다");
    }

    console.log(`[Internal] Workflow API로 이미지 전달: ${issueId}`);
    console.log(
      `[Internal] Workflow URL: ${this.workflowAPIURL}/atlassian/jira/issues/${issueId}/image`,
    );
    console.log(
      `[Internal] API Key 설정 여부: ${!!process.env.WORKFLOW_API_KEY}`,
    );

    // FormData 생성
    const formData = new FormData();
    formData.append("image", file.buffer, {
      filename: file.originalname || `capture-${Date.now()}.png`,
      contentType: file.mimetype,
    });

    try {
      // Workflow API로 바이패스 (티켓 생성과 동일한 경로 패턴 사용)
      const response = await axios.post(
        `${this.workflowAPIURL}/atlassian/jira/issues/${issueId}/image`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: process.env.WORKFLOW_API_KEY || "",
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      console.log(`[Internal] Workflow API 응답 성공`);
      return response.data;
    } catch (error) {
      console.error(`[Internal] Workflow API 에러:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });
      throw error;
    }
  }
}

interface WorkflowResponse<T> {
  code: string;
  message: string;
  status: string;
  statusMessage: string;
  data: T;
}

interface MemberDTO {
  items: {
    updatedAt: string;
    createdAt: string;
    deletedAt: string | null;
    id: number;
    identification: string;
    birthDay: string;
    name: string;
    email: string;
    team: string;
    slackId: string;
    profile: string;
    gitlabId: string | null;
    notionId: string | null;
    notionMemoryItem: string | null;
    isPartner: boolean;
    hasWelcomed: boolean;
    isWorking: boolean;
    notification: boolean;
    mention: boolean;
    hasMorningAlarm: boolean;
  }[];
}
