/**
 * API 클라이언트 유틸리티 - 새로운 에러 형식 대응
 */

import { ErrorCodes } from "./api-error-handler";

interface ErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: any;
  timestamp: string;
  path?: string;
}

// API 클라이언트 클래스
export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = "http://localhost:3001") {
    this.baseURL = baseURL;
  }

  /**
   * API 요청 래퍼
   */
  async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const data = await response.json();

      // 에러 응답인지 확인 (statusCode가 있으면 에러)
      if ("statusCode" in data) {
        throw new ApiError(data as ErrorResponse);
      }

      // 성공 응답 처리 (기존 형식)
      if ("success" in data && data.success) {
        return data.data as T;
      }

      // 예상치 못한 형식
      throw new Error("Unexpected response format");
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // 네트워크 에러 등
      throw new Error(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * GET 요청
   */
  async get<T = any>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  /**
   * POST 요청
   */
  async post<T = any>(path: string, body: any): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT 요청
   */
  async put<T = any>(path: string, body: any): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}

/**
 * 커스텀 API 에러 클래스
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: any;
  public readonly timestamp: string;
  public readonly path?: string;

  constructor(response: ErrorResponse) {
    super(response.message);
    this.name = "ApiError";
    this.statusCode = response.statusCode;
    this.errorCode = response.errorCode;
    this.details = response.details;
    this.timestamp = response.timestamp;
    this.path = response.path;
  }

  /**
   * 특정 에러 코드인지 확인
   */
  is(errorCode: string): boolean {
    return this.errorCode === errorCode;
  }

  /**
   * 인증 관련 에러인지 확인
   */
  isAuthError(): boolean {
    return this.errorCode.startsWith("AUTH_");
  }

  /**
   * 장치 관련 에러인지 확인
   */
  isDeviceError(): boolean {
    return this.errorCode.startsWith("DEVICE_");
  }

  /**
   * 시스템 에러인지 확인
   */
  isSystemError(): boolean {
    return this.errorCode.startsWith("SYSTEM_");
  }
}

/**
 * 사용 예시
 */
export const exampleUsage = async () => {
  const api = new ApiClient();

  try {
    // 템플릿 목록 조회
    const ticketTemplateList = await api.get("/api/user-templates");
    console.log("ticketTemplateList:", ticketTemplateList);
  } catch (error) {
    if (error instanceof ApiError) {
      // 에러 코드별 처리
      switch (error.errorCode) {
        case ErrorCodes.DEVICE_NOT_FOUND:
          console.error("장치를 찾을 수 없습니다:", error.details);
          // 장치 재등록 유도
          break;

        case ErrorCodes.DEVICE_USER_NOT_FOUND:
          console.error("사용자 정보가 없습니다:", error.details);
          // 로그인 페이지로 이동
          break;

        case ErrorCodes.TEMPLATE_NOT_FOUND:
          console.error("템플릿을 찾을 수 없습니다");
          // 빈 상태 표시
          break;

        default:
          console.error(`API Error [${error.errorCode}]:`, error.message);
      }
    } else {
      console.error("Unknown error:", error);
    }
  }
};

/**
 * React Hook 예시
 */
export const useApi = () => {
  const api = new ApiClient();

  const handleApiError = (error: unknown) => {
    if (error instanceof ApiError) {
      // 인증 에러는 자동으로 로그아웃
      if (error.isAuthError()) {
        // logout()
        window.location.href = "/login";
        return;
      }

      // 장치 에러는 특별 처리
      if (error.isDeviceError()) {
        // showDeviceErrorModal()
        console.error("Device error:", error.errorCode);
        return;
      }

      // 기타 에러는 토스트 메시지
      // toast.error(error.message)
      alert(error.message);
    } else {
      // 예상치 못한 에러
      console.error("Unexpected error:", error);
      alert("서비스에 문제가 발생했습니다.");
    }
  };

  return { api, handleApiError };
};
