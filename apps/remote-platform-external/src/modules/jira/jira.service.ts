import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import * as FormData from "form-data";

import { convertRecordLink, createUserDataText } from "../../utils/utils";
import { UserInfoService } from "../user-info/user-info.service";
import { TicketFormData, UserData } from "../webview/webview.gateway";

export interface UpdateResponseBody {
  readonly recordId: number;
  readonly requestId: number;
  readonly body: string;
  readonly base64Encoded: boolean;
}

interface AtlassianDocumentNode {
  readonly type: string;
  readonly attrs?: Record<string, unknown>;
  readonly content?: ReadonlyArray<AtlassianDocumentNode>;
  readonly text?: string;
  readonly marks?: ReadonlyArray<Record<string, unknown>>;
}

interface AtlassianDocumentFormat {
  readonly type: "doc";
  readonly version: number;
  readonly content: AtlassianDocumentNode[];
}

export interface CreateTicketRequestBody {
  readonly username: string;
  readonly assignee: string;
  readonly title: string;
  readonly priority: string;
  readonly description: AtlassianDocumentFormat;
  readonly project: string;
  readonly components: string[];
  readonly labels: string[];
  readonly parent: string;
  readonly issuetype: string;
}

/** Jira REST API v3 create issue response. */
interface JiraCreateIssueResponse {
  readonly id: string;
  readonly key: string;
  readonly self: string;
}

/** Jira REST API v3 user search response. */
interface JiraUser {
  readonly accountId: string;
  readonly displayName: string;
  readonly emailAddress?: string;
  readonly active: boolean;
}

interface UploadedFile {
  readonly buffer: Buffer;
  readonly originalname?: string;
  readonly mimetype: string;
}

const DEFAULT_ISSUE_TYPE = "\uBC84\uADF8";

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private readonly jiraHostUrl = process.env.JIRA_HOST_URL;
  private readonly jiraClient: AxiosInstance;

  constructor(private readonly userInfoService: UserInfoService) {
    const email = process.env.JIRA_API_EMAIL;
    const token = process.env.JIRA_API_TOKEN;

    this.jiraClient = axios.create({
      baseURL: `${this.jiraHostUrl}/rest/api/3`,
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.logger.log(
      `JiraService initialized: Jira host=${this.jiraHostUrl}, email=${email}`,
    );
  }

  /**
   * Creates a Jira ticket for the given room/record session.
   */
  public async createTicket(data: {
    roomName: string;
    recordId: number;
    userData: UserData;
    formData?: TicketFormData;
  }): Promise<{
    ticketUrl: string;
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

      if (!userInfo?.jiraProjectKey) {
        throw new Error(
          "Ticket creation failed: Jira project key is not configured",
        );
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
        issuetype: DEFAULT_ISSUE_TYPE,
      };

      // Build Jira REST API v3 request body
      const jiraFields: Record<string, unknown> = {
        project: { key: requestBody.project },
        summary: requestBody.title,
        description: requestBody.description,
        issuetype: { name: requestBody.issuetype },
        priority: { id: requestBody.priority },
        labels: requestBody.labels,
      };

      if (requestBody.components.length > 0) {
        jiraFields.components = requestBody.components.map((name) => ({
          name,
        }));
      }

      if (requestBody.parent) {
        jiraFields.parent = { key: requestBody.parent };
      }

      // Try to resolve assignee account ID
      const assigneeAccountId = await this.findUserAccountId(
        requestBody.assignee,
      );
      if (assigneeAccountId) {
        jiraFields.assignee = { accountId: assigneeAccountId };
      }

      this.logger.log(
        `[JIRA_API_REQUEST] ${JSON.stringify({
          url: `${this.jiraHostUrl}/rest/api/3/issue`,
          method: "POST",
          project: requestBody.project,
          summary: requestBody.title,
          assignee: requestBody.assignee,
          assigneeAccountId,
          deviceId: userData.commonInfo.device.deviceId,
          recordId,
          roomName,
        })}`,
      );

      const response = await this.jiraClient.post<JiraCreateIssueResponse>(
        "/issue",
        { fields: jiraFields },
      );

      const ticketUrl = `${this.jiraHostUrl}/browse/${response.data.key}`;

      this.logger.log(
        `[JIRA_TICKET_CREATED] ${JSON.stringify({
          ticketUrl,
          ticketKey: response.data.key,
          ticketId: response.data.id,
          assignee: requestBody.assignee,
          project: requestBody.project,
          deviceId: userData.commonInfo.device.deviceId,
        })}`,
      );

      return {
        ticketUrl,
        ticketKey: response.data.key,
        requestBody,
      };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorData: Record<string, unknown> = {
        message: errorMessage,
        deviceId: userData.commonInfo.device.deviceId,
        recordId,
        roomName,
        formData: formData ? JSON.stringify(formData) : null,
      };

      const axiosResponse = err.response as Record<string, unknown> | undefined;
      if (axiosResponse) {
        errorData.response = {
          status: axiosResponse.status,
          statusText: axiosResponse.statusText,
          data: axiosResponse.data,
        };
      }

      this.logger.error(`[JIRA_API_ERROR] ${JSON.stringify(errorData)}`);

      throw new Error(`Jira ticket creation failed: ${errorMessage}`);
    }
  }

  /**
   * Searches for a Jira user by display name or email and returns their account ID.
   */
  private async findUserAccountId(
    query: string,
  ): Promise<string | null> {
    try {
      const response = await this.jiraClient.get<JiraUser[]>(
        "/user/search",
        { params: { query, maxResults: 1 } },
      );
      if (response.data.length > 0 && response.data[0].active) {
        return response.data[0].accountId;
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `[JIRA_USER_SEARCH] Could not find user "${query}": ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Builds the Atlassian Document Format description for a Jira ticket.
   */
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
    const content: AtlassianDocumentNode[] = [];

    // [Reproduction Environment] section - included for all job types
    content.push(
      this.buildHeading("[Reproduction Environment]"),
      {
        type: "codeBlock",
        attrs: { language: "java" },
        content: [{ type: "text", text: createUserDataText(userData) }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Recording Session Link",
            marks: [
              {
                type: "link",
                attrs: {
                  href: convertRecordLink(roomName, recordId),
                  title: "Link",
                },
              },
            ],
          },
        ],
      },
      { type: "rule" },
    );

    // Additional sections for QA and PM roles
    if (jobType === "QA" || jobType === "PM") {
      content.push(
        this.buildHeading("[Preconditions]"),
        this.buildBulletList(" "),
        this.buildHeading("[Findings]"),
        {
          type: "blockquote",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "-" }] },
          ],
        },
        this.buildHeading("[Expected Result]"),
        this.buildBulletList("-"),
        this.buildHeading("[Actual Result]"),
        this.buildBulletList("-"),
        this.buildHeading("[Reproduction Frequency]"),
        this.buildBulletList("Always (10/10)"),
      );
    }

    // [Notes] section - included for all job types
    content.push(this.buildHeading("[Notes]"), this.buildBulletList("-"));

    return { type: "doc", version: 1, content };
  }

  private buildHeading(text: string): AtlassianDocumentNode {
    return {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text }],
    };
  }

  private buildBulletList(text: string): AtlassianDocumentNode {
    return {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text }] }],
        },
      ],
    };
  }

  /**
   * Uploads an image as an attachment to a Jira issue.
   */
  public async uploadImageToJira(
    issueId: string,
    file: UploadedFile,
  ): Promise<unknown> {
    const formData = new FormData();
    formData.append("file", file.buffer, {
      filename: file.originalname || `capture-${Date.now()}.png`,
      contentType: file.mimetype,
    });

    const response = await this.jiraClient.post(
      `/issue/${issueId}/attachments`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-Atlassian-Token": "no-check",
          // Override Content-Type from jiraClient default (multipart needed here)
          "Content-Type": undefined,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );

    return response.data;
  }
}
