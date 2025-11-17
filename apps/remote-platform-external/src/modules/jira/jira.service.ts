import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import * as FormData from "form-data";

import { convertRecordLink, createUserDataText } from "../../utils/utils";
import { UserInfoService } from "../user-info/user-info.service";
import { TicketFormData, UserData } from "../webview/webview.gateway";

/**
 * 네트워크 요청 업데이트 응답 본문을 나타내는 인터페이스.
 */
export interface UpdateResponseBody {
  /** 녹화 세션 식별자 */
  readonly recordId: number;
  /** 네트워크 요청 식별자 */
  readonly requestId: number;
  /** 응답 본문 문자열 */
  readonly body: string;
  /** Base64 인코딩 여부 */
  readonly base64Encoded: boolean;
}

/**
 * Atlassian Document Format(ADF)의 단일 노드를 나타내는 인터페이스.
 */
interface AtlassianDocumentNode {
  /** 노드 유형 (예: "heading", "paragraph", "text" 등) */
  readonly type: string;
  /** 노드 속성 (예: 레벨, 언어 등) */
  readonly attrs?: Record<string, unknown>;
  /** 자식 노드 목록 */
  readonly content?: ReadonlyArray<AtlassianDocumentNode>;
  /** 텍스트 노드의 실제 문자열 값 */
  readonly text?: string;
  /** 텍스트 서식 정보 (예: 링크, 볼드 등) */
  readonly marks?: ReadonlyArray<Record<string, unknown>>;
}

/**
 * Atlassian Document Format(ADF)의 최상위 문서 구조.
 */
interface AtlassianDocumentFormat {
  /** 문서 타입 (항상 "doc") */
  readonly type: "doc";
  /** ADF 스키마 버전 */
  readonly version: number;
  /** 문서 본문을 구성하는 노드 배열 */
  readonly content: AtlassianDocumentNode[];
}

/**
 * Jira 티켓 생성에 필요한 요청 본문 인터페이스.
 */
export interface CreateTicketRequestBody {
  /** 티켓 생성자 사용자명 */
  readonly username: string;
  /** 티켓 담당자 사용자명 */
  readonly assignee: string;
  /** 티켓 제목 */
  readonly title: string;
  /** 우선순위 ID (예: "3") */
  readonly priority: string;
  /** ADF 형식의 티켓 설명 */
  readonly description: AtlassianDocumentFormat;
  /** Jira 프로젝트 키 */
  readonly project: string;
  /** 컴포넌트 이름 목록 */
  readonly components: string[];
  /** 라벨 목록 */
  readonly labels: string[];
  /** 상위 에픽 이슈 키 */
  readonly parent: string;
  /** 이슈 유형 이름 */
  readonly issuetype: string;
}

/**
 * Jira REST API v3 이슈 생성 응답 인터페이스.
 */
interface JiraCreateIssueResponse {
  /** 생성된 이슈의 내부 ID */
  readonly id: string;
  /** 생성된 이슈 키 (예: "PROJ-123") */
  readonly key: string;
  /** 생성된 이슈의 REST API URL */
  readonly self: string;
}

/**
 * Jira REST API v3 사용자 검색 응답 인터페이스.
 */
interface JiraUser {
  /** 사용자 계정 ID */
  readonly accountId: string;
  /** 사용자 표시 이름 */
  readonly displayName: string;
  /** 사용자 이메일 주소 (선택) */
  readonly emailAddress?: string;
  /** 계정 활성화 상태 */
  readonly active: boolean;
}

/**
 * Jira 첨부파일 업로드에 사용되는 파일 정보 인터페이스.
 */
interface UploadedFile {
  /** 파일 바이너리 데이터 */
  readonly buffer: Buffer;
  /** 원본 파일명 (선택) */
  readonly originalname?: string;
  /** MIME 타입 (예: "image/png") */
  readonly mimetype: string;
}

/** 기본 이슈 유형 ("버그") */
const DEFAULT_ISSUE_TYPE = "\uBC84\uADF8";

/**
 * Jira REST API v3를 통해 티켓 생성 및 첨부파일 업로드를 처리하는 서비스.
 * 환경변수: JIRA_HOST_URL, JIRA_API_EMAIL, JIRA_API_TOKEN
 */
@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private readonly jiraHostUrl = process.env.JIRA_HOST_URL;
  private readonly jiraClient: AxiosInstance;

  /**
   * JiraService 인스턴스를 초기화하고 Jira API 클라이언트를 구성한다.
   * @param userInfoService - 사용자 정보 조회 서비스
   */
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

    const maskedEmail = email
      ? `${email[0]}***@${email.split("@")[1] || "***"}`
      : "undefined";
    this.logger.log(
      `JiraService initialized: Jira host=${this.jiraHostUrl}, email=${maskedEmail}`,
    );
  }

  /**
   * 지정된 녹화 세션에 대한 Jira 티켓을 생성한다.
   * @param data - 룸 이름, 레코드 ID, 사용자 데이터, 폼 데이터
   * @returns 생성된 티켓 URL, 키, 요청 본문
   * @throws Jira API 호출 실패 시 또는 프로젝트 키 미설정 시 에러
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
   * 표시 이름 또는 이메일로 Jira 사용자를 검색하여 계정 ID를 반환한다.
   * @param query - 검색할 사용자 이름 또는 이메일
   * @returns 활성 사용자의 계정 ID, 미발견 시 null
   */
  private async findUserAccountId(query: string): Promise<string | null> {
    try {
      const response = await this.jiraClient.get<JiraUser[]>("/user/search", {
        params: { query, maxResults: 1 },
      });
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
   * Jira 티켓용 Atlassian Document Format(ADF) 설명을 구성한다.
   * @param params - 룸 이름, 레코드 ID, 사용자 데이터, 직무 유형
   * @returns ADF 형식의 티켓 설명 문서
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

  /**
   * ADF 형식의 레벨 3 제목 노드를 생성한다.
   * @param text - 제목 텍스트
   * @returns ADF 제목 노드
   */
  private buildHeading(text: string): AtlassianDocumentNode {
    return {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text }],
    };
  }

  /**
   * ADF 형식의 단일 항목 불릿 리스트 노드를 생성한다.
   * @param text - 목록 항목 텍스트
   * @returns ADF 불릿 리스트 노드
   */
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
   * Jira 이슈에 이미지를 첨부파일로 업로드한다.
   * @param issueId - 대상 Jira 이슈 ID 또는 키
   * @param file - 업로드할 파일 정보 (버퍼, 파일명, MIME 타입)
   * @returns Jira 첨부파일 업로드 API 응답 데이터
   * @throws Jira 첨부파일 API 호출 실패 시 에러
   */
  public async uploadImageToJira(
    issueId: string,
    file: UploadedFile,
  ): Promise<unknown> {
    if (!/^[A-Z]+-\d+$/.test(issueId)) {
      throw new Error(`Invalid issueId format: ${issueId}`);
    }

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
