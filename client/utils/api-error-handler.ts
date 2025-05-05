/**
 * API 에러 처리를 위한 유틸리티
 */

export interface ApiErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: any;
  timestamp: string;
  path?: string;
}

// 에러 코드 상수 (서버와 동일하게 유지)
export const ErrorCodes = {
  // 인증 관련
  AUTH_INVALID_TOKEN: "AUTH_001",
  AUTH_EXPIRED_TOKEN: "AUTH_002",
  AUTH_UNAUTHORIZED: "AUTH_003",
  AUTH_USER_NOT_FOUND: "AUTH_004",

  // 장치/세션
  DEVICE_NOT_FOUND: "DEVICE_001",
  DEVICE_USER_NOT_FOUND: "DEVICE_002",
  SESSION_NOT_FOUND: "SESSION_001",
  SESSION_EXPIRED: "SESSION_002",

  // 템플릿
  TEMPLATE_NOT_FOUND: "TEMPLATE_001",
  TEMPLATE_CREATION_FAILED: "TEMPLATE_002",
  TEMPLATE_UPDATE_FAILED: "TEMPLATE_003",

  // JIRA
  JIRA_CONNECTION_FAILED: "JIRA_001",
  JIRA_TICKET_CREATION_FAILED: "JIRA_002",
  JIRA_INVALID_PROJECT: "JIRA_003",
  JIRA_ATTACHMENT_FAILED: "JIRA_004",

  // Slack
  SLACK_CONNECTION_FAILED: "SLACK_001",
  SLACK_MESSAGE_SEND_FAILED: "SLACK_002",
  SLACK_CHANNEL_NOT_FOUND: "SLACK_003",

  // 시스템
  INTERNAL_SERVER_ERROR: "SYSTEM_001",
  DATABASE_ERROR: "SYSTEM_002",
  EXTERNAL_SERVICE_ERROR: "SYSTEM_003",
  TIMEOUT_ERROR: "SYSTEM_004",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * API 에러 핸들러 클래스
 */
export class ApiErrorHandler {
  /**
   * 에러 응답 파싱
   */
  static parseError(error: any): ApiErrorResponse | null {
    if (error.response?.data && "errorCode" in error.response.data) {
      return error.response.data as ApiErrorResponse;
    }
    return null;
  }

  /**
   * 에러 코드별 처리
   */
  static handleError(error: any): void {
    const apiError = this.parseError(error);

    if (!apiError) {
      console.error("Unknown error:", error);
      this.showDefaultErrorMessage();
      return;
    }

    // 에러 코드별 분기 처리
    switch (apiError.errorCode) {
      case ErrorCodes.AUTH_INVALID_TOKEN:
      case ErrorCodes.AUTH_EXPIRED_TOKEN:
        this.handleAuthError(apiError);
        break;

      case ErrorCodes.DEVICE_NOT_FOUND:
      case ErrorCodes.DEVICE_USER_NOT_FOUND:
        this.handleDeviceError(apiError);
        break;

      case ErrorCodes.TEMPLATE_NOT_FOUND:
        this.handleTemplateError(apiError);
        break;

      case ErrorCodes.JIRA_CONNECTION_FAILED:
      case ErrorCodes.JIRA_TICKET_CREATION_FAILED:
        this.handleJiraError(apiError);
        break;

      case ErrorCodes.SLACK_CONNECTION_FAILED:
      case ErrorCodes.SLACK_MESSAGE_SEND_FAILED:
        this.handleSlackError(apiError);
        break;

      case ErrorCodes.INTERNAL_SERVER_ERROR:
      case ErrorCodes.DATABASE_ERROR:
        this.handleSystemError(apiError);
        break;

      default:
        this.showErrorMessage(apiError.message);
    }

    // 개발 환경에서는 상세 로그 출력
    if (process.env.NODE_ENV === "development") {
      console.error("API Error Details:", {
        errorCode: apiError.errorCode,
        message: apiError.message,
        details: apiError.details,
        path: apiError.path,
        timestamp: apiError.timestamp,
      });
    }
  }

  private static handleAuthError(error: ApiErrorResponse): void {
    // 인증 에러 처리: 로그아웃, 리다이렉트 등
    console.error("Authentication error:", error.message);
    // 예: 로그인 페이지로 리다이렉트
    // window.location.href = '/login'
    this.showErrorMessage("인증이 필요합니다. 다시 로그인해주세요.");
  }

  private static handleDeviceError(error: ApiErrorResponse): void {
    console.error("Device error:", error.message);
    this.showErrorMessage(
      "장치 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.",
    );
  }

  private static handleTemplateError(error: ApiErrorResponse): void {
    console.error("Template error:", error.message);
    this.showErrorMessage(error.message);
  }

  private static handleJiraError(error: ApiErrorResponse): void {
    console.error("JIRA error:", error.message);
    this.showErrorMessage(
      "JIRA 연동 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    );
  }

  private static handleSlackError(error: ApiErrorResponse): void {
    console.error("Slack error:", error.message);
    this.showErrorMessage(
      "Slack 연동 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    );
  }

  private static handleSystemError(error: ApiErrorResponse): void {
    console.error("System error:", error.message);
    this.showErrorMessage(
      "시스템 오류가 발생했습니다. 관리자에게 문의해주세요.",
    );
  }

  private static showErrorMessage(message: string): void {
    // TODO: 토스트 메시지 또는 알림 UI 표시
    // 예: toast.error(message)
    alert(message); // 임시 구현
  }

  private static showDefaultErrorMessage(): void {
    this.showErrorMessage("요청 처리 중 오류가 발생했습니다.");
  }
}

/**
 * Axios 인터셉터 설정 예시
 */
export const setupAxiosErrorInterceptor = (axiosInstance: any): void => {
  axiosInstance.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      ApiErrorHandler.handleError(error);
      return Promise.reject(error);
    },
  );
};

/**
 * 사용 예시
 */
export const exampleUsage = async () => {
  try {
    // API 호출
    const response = await fetch("/api/templates");
    const data = await response.json();

    if (!response.ok) {
      // 에러 응답 처리
      ApiErrorHandler.handleError({ response: { data } });
    }

    return data;
  } catch (error) {
    ApiErrorHandler.handleError(error);
    throw error;
  }
};
