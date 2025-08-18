import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import * as FormData from "form-data";

import { convertRecordLink, createUserDataText } from "../../utils/utils";
import { UserInfoService } from "../user-info/user-info.service";
import { TicketFormData, UserData } from "../webview/webview.gateway";

export type UpdateResponseBody = {
  recordId: number;
  requestId: number;
  body: string;
  base64Encoded: boolean;
};

interface AtlassianDocumentFormat {
  type: "doc";
  version: number;
  content: any[];
}

export interface CreateTicketRequestBody {
  username: string;
  assignee: string;
  title: string;
  priority: string;
  description: AtlassianDocumentFormat;
  project: string;
  components: string[];
  labels: string[];
  parent: string;
  issuetype: string;
}

interface CreateTicketResponseBody {
  code: string;
  status: string;
  statusMessage: string;
  message: string;
  data: {
    id: string;
    key: string;
    self: string;
    fields: {
      summary: string;
      description: string;
      status: {
        self: string;
        description: string;
        iconUrl: string;
        name: string;
        id: string;
        statusCategory: {
          self: string;
          id: number;
          key: string;
          colorName: string;
          name: string;
        };
      };
    };
  };
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private readonly workflowAPIURL = process.env.WORKFLOW_API_URL;

  constructor(private readonly userInfoService: UserInfoService) {
    this.logger.log("JiraService 초기화: 어드민 DB 기반 사용자 정보 사용");
  }

  public async createTicket(data: {
    roomName: string;
    recordId: number;
    userData: UserData;
    formData?: TicketFormData;
  }): Promise<{
    ticketURL: string;
    ticketKey: string;
    requestBody: CreateTicketRequestBody;
  }> {
    const { roomName, recordId, userData, formData } = data;

    try {
      const userInfo = await this.userInfoService.getUserInfoByDeviceId(
        userData.commonInfo.device.deviceId,
      );

      this.logger.log(
        `[JIRA_USER_INFO] ${JSON.stringify({
          deviceId: userData.commonInfo.device.deviceId,
          username: userInfo?.username,
          jiraProjectKey: userInfo?.jiraProjectKey,
          userInfoFound: !!userInfo,
        })}`,
      );

      if (!userInfo.jiraProjectKey) {
        throw new Error("티켓 생성 실패: Jira 프로젝트 키가 없습니다.");
      }

      const requestBody: CreateTicketRequestBody = {
        username: userInfo.username,
        assignee: formData?.assignee ?? userInfo.username,
        title:
          formData?.title ?? "Auto-generated ticket from Remote Debug Tools",
        priority: "3",
        description: this.buildTicketDescription({
          roomName,
          recordId,
          userData,
          jobType: userInfo.jobType,
        }),
        project: userInfo.jiraProjectKey,
        components: formData?.components ?? [],
        labels: formData?.labels ?? [],
        parent: formData?.Epic,
        issuetype: "버그",
      };

      this.logger.log(
        `[JIRA_API_REQUEST] ${JSON.stringify({
          url: `${this.workflowAPIURL}/atlassian/jira/issues`,
          method: "POST",
          requestBody: {
            ...requestBody,
            description: "[OMITTED_FOR_BREVITY]", // description이 너무 길어서 생략
          },
          deviceId: userData.commonInfo.device.deviceId,
          recordId,
          roomName,
        })}`,
      );

      const response = await axios.post<CreateTicketResponseBody>(
        `${this.workflowAPIURL}/atlassian/jira/issues`,
        requestBody,
      );

      const jiraResponse = response.data;

      this.logger.log(
        `[JIRA_API_RESPONSE] ${JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          responseData: jiraResponse,
          ticketKey: jiraResponse.data?.key,
          ticketId: jiraResponse.data?.id,
          deviceId: userData.commonInfo.device.deviceId,
        })}`,
      );

      if (jiraResponse.status !== "CREATED") {
        throw new Error(`티켓 생성 실패: ${jiraResponse.message}`);
      }

      const ticketURL = `${process.env.JIRA_HOST_URL}/browse/${response.data.data.key}`;

      this.logger.log(
        `[JIRA_TICKET_CREATED] ${JSON.stringify({
          ticketURL,
          ticketKey: response.data.data.key,
          assignee: requestBody.assignee,
          project: requestBody.project,
          components: requestBody.components,
          labels: requestBody.labels,
          parent: requestBody.parent,
          deviceId: userData.commonInfo.device.deviceId,
        })}`,
      );

      return {
        ticketURL,
        ticketKey: response.data.data.key,
        requestBody,
      };
    } catch (error) {
      const errorData: any = {
        message: error.message,
        deviceId: userData.commonInfo.device.deviceId,
        recordId,
        roomName,
        formData: formData ? JSON.stringify(formData) : null,
      };

      if (error.response) {
        errorData.response = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        };
      }

      if (error.request && !error.response) {
        // 요청은 보냈지만 응답이 없는 경우
        errorData.request = {
          method: error.request.method,
          path: error.request.path,
          headers: error.request.getHeaders?.() || error.request.headers,
        };
      }

      if (error.config) {
        errorData.config = {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
          headers: error.config.headers,
        };
      }

      if (error instanceof Error) {
        errorData.errorDetails = {
          name: error.name,
          stack: error.stack,
        };
      }

      this.logger.error(`[JIRA_API_ERROR] ${JSON.stringify(errorData)}`);

      throw new Error(`Jira 티켓 생성 실패: ${error.message}`);
    }
  }

  // 푸드 + 스토어 양식
  private buildTicketDescription({
    roomName,
    recordId,
    userData,
    jobType,
  }: {
    roomName: string;
    recordId: number;
    userData: UserData;
    jobType?: string;
  }): AtlassianDocumentFormat {
    const content = [];

    // [재현환경] 섹션 - 모든 직군에 포함
    content.push(
      {
        type: "heading",
        attrs: { level: 3 },
        content: [
          {
            type: "text",
            text: "[재현환경]",
          },
        ],
      },
      {
        type: "codeBlock",
        attrs: { language: "java" },
        content: [
          {
            type: "text",
            text: createUserDataText(userData),
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "녹화 세션 링크",
            marks: [
              {
                type: "link",
                attrs: {
                  href: convertRecordLink(roomName, recordId),
                  title: "링크",
                },
              },
            ],
          },
        ],
      },
      {
        type: "rule",
      },
    );

    // QA, PM 직군에만 추가되는 섹션들
    if (jobType === "QA" || jobType === "PM") {
      // [사전조건] 섹션
      content.push(
        {
          type: "heading",
          attrs: { level: 3 },
          content: [
            {
              type: "text",
              text: "[사전조건]",
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: " ",
                    },
                  ],
                },
              ],
            },
          ],
        },
      );

      // [발견상황] 섹션
      content.push(
        {
          type: "heading",
          attrs: { level: 3 },
          content: [
            {
              type: "text",
              text: "[발견상황]",
            },
          ],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "-",
                },
              ],
            },
          ],
        },
      );

      // [예상결과] 섹션
      content.push(
        {
          type: "heading",
          attrs: { level: 3 },
          content: [
            {
              type: "text",
              text: "[예상결과]",
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "-",
                    },
                  ],
                },
              ],
            },
          ],
        },
      );

      // [실제결과] 섹션
      content.push(
        {
          type: "heading",
          attrs: { level: 3 },
          content: [
            {
              type: "text",
              text: "[실제결과]",
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "-",
                    },
                  ],
                },
              ],
            },
          ],
        },
      );

      // [재현빈도] 섹션
      content.push(
        {
          type: "heading",
          attrs: { level: 3 },
          content: [
            {
              type: "text",
              text: "[재현빈도]",
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "항상 발생 (10/10)",
                    },
                  ],
                },
              ],
            },
          ],
        },
      );
    }

    // [노트] 섹션 - 모든 직군에 포함
    content.push(
      {
        type: "heading",
        attrs: { level: 3 },
        content: [
          {
            type: "text",
            text: "[노트]",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "-",
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    return {
      type: "doc",
      version: 1,
      content: content,
    };
  }

  /**
   * Internal server로 이미지 업로드 요청 바이패스
   */
  public async uploadImageToJira(issueId: string, file: any) {
    // FormData 생성
    const formData = new FormData();
    formData.append("image", file.buffer, {
      filename: file.originalname || `capture-${Date.now()}.png`,
      contentType: file.mimetype,
    });

    // Internal server URL (환경변수로 관리)
    const internalServerUrl = process.env.INTERNAL_SERVER_URL;

    if (!internalServerUrl) {
      this.logger.error("INTERNAL_SERVER_URL 환경변수가 설정되지 않았습니다");
      throw new Error("Internal server URL is not set");
    }

    this.logger.log(
      `[Upload] Internal Server로 이미지 전송: ${internalServerUrl}/workflow/jira/issues/${issueId}/image`,
    );

    // Internal server로 바이패스
    const response = await axios.post(
      `${internalServerUrl}/workflow/jira/issues/${issueId}/image`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );

    return response.data;
  }
}
