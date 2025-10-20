import { HttpException, HttpStatus } from "@nestjs/common";

import { ErrorCode, ErrorMessages } from "./error-codes.enum";

/**
 * 비즈니스 예외 발생 시 클라이언트에 반환되는 표준 에러 응답 인터페이스.
 */
export interface BusinessErrorResponse {
  /** HTTP 상태 코드 */
  statusCode: number;
  /** 애플리케이션 고유 에러 코드 */
  errorCode: ErrorCode;
  /** 사람이 읽을 수 있는 에러 메시지 */
  message: string;
  /** 추가 에러 상세 정보 (선택) */
  details?: any;
  /** 에러 발생 시각 (ISO 8601 형식) */
  timestamp: string;
  /** 에러가 발생한 요청 경로 (선택) */
  path?: string;
}

/**
 * 비즈니스 로직 예외를 나타내는 커스텀 HTTP 예외 클래스.
 * 표준화된 에러 응답 형식(BusinessErrorResponse)을 제공한다.
 */
export class BusinessException extends HttpException {
  /** 애플리케이션 고유 에러 코드 */
  public readonly errorCode: ErrorCode;
  /** 추가 에러 상세 정보 */
  public readonly details?: any;

  /**
   * BusinessException 인스턴스를 생성한다.
   * @param errorCode - 애플리케이션 고유 에러 코드
   * @param customMessage - 기본 메시지를 대체할 커스텀 에러 메시지 (선택)
   * @param httpStatus - HTTP 상태 코드 (기본값: 400 BAD_REQUEST)
   * @param details - 추가 에러 상세 정보 (선택)
   */
  constructor(
    errorCode: ErrorCode,
    customMessage?: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: any,
  ) {
    const message =
      customMessage || ErrorMessages[errorCode] || "An unknown error occurred.";

    const response: BusinessErrorResponse = {
      statusCode: httpStatus,
      errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    super(response, httpStatus);
    this.errorCode = errorCode;
    this.details = details;
  }

  /**
   * 사용자를 찾을 수 없을 때 발생시키는 팩토리 메서드.
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 404 상태의 BusinessException
   */
  static userNotFound(details?: any): BusinessException {
    return new BusinessException(
      ErrorCode.AUTH_USER_NOT_FOUND,
      undefined,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  /**
   * 디바이스를 찾을 수 없을 때 발생시키는 팩토리 메서드.
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 404 상태의 BusinessException
   */
  static deviceNotFound(details?: any): BusinessException {
    return new BusinessException(
      ErrorCode.DEVICE_NOT_FOUND,
      undefined,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  /**
   * 디바이스 사용자를 찾을 수 없을 때 발생시키는 팩토리 메서드.
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 404 상태의 BusinessException
   */
  static deviceUserNotFound(details?: any): BusinessException {
    return new BusinessException(
      ErrorCode.DEVICE_USER_NOT_FOUND,
      undefined,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  /**
   * 인증되지 않은 접근 시 발생시키는 팩토리 메서드.
   * @param customMessage - 커스텀 에러 메시지 (선택)
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 401 상태의 BusinessException
   */
  static unauthorized(
    customMessage?: string,
    details?: any,
  ): BusinessException {
    return new BusinessException(
      ErrorCode.AUTH_UNAUTHORIZED,
      customMessage,
      HttpStatus.UNAUTHORIZED,
      details,
    );
  }

  /**
   * 유효성 검증 실패 시 발생시키는 팩토리 메서드.
   * @param customMessage - 커스텀 에러 메시지 (선택)
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 400 상태의 BusinessException
   */
  static validationFailed(
    customMessage?: string,
    details?: any,
  ): BusinessException {
    return new BusinessException(
      ErrorCode.VALIDATION_FAILED,
      customMessage,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }

  /**
   * 리소스를 찾을 수 없을 때 발생시키는 팩토리 메서드.
   * @param resourceName - 찾을 수 없는 리소스 이름
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 404 상태의 BusinessException
   */
  static resourceNotFound(
    resourceName: string,
    details?: any,
  ): BusinessException {
    return new BusinessException(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resourceName} not found.`,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  /**
   * 템플릿을 찾을 수 없을 때 발생시키는 팩토리 메서드.
   * @param templateName - 찾을 수 없는 템플릿 이름
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 404 상태의 BusinessException
   */
  static templateNotFound(
    templateName: string,
    details?: any,
  ): BusinessException {
    return new BusinessException(
      ErrorCode.TEMPLATE_NOT_FOUND,
      `Template '${templateName}' not found.`,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  /**
   * JIRA 관련 에러 발생 시 사용하는 팩토리 메서드.
   * @param errorCode - JIRA 관련 에러 코드
   * @param customMessage - 커스텀 에러 메시지 (선택)
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 503 상태의 BusinessException
   */
  static jiraError(
    errorCode: ErrorCode,
    customMessage?: string,
    details?: any,
  ): BusinessException {
    return new BusinessException(
      errorCode,
      customMessage,
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
    );
  }

  /**
   * Slack 관련 에러 발생 시 사용하는 팩토리 메서드.
   * @param errorCode - Slack 관련 에러 코드
   * @param customMessage - 커스텀 에러 메시지 (선택)
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 503 상태의 BusinessException
   */
  static slackError(
    errorCode: ErrorCode,
    customMessage?: string,
    details?: any,
  ): BusinessException {
    return new BusinessException(
      errorCode,
      customMessage,
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
    );
  }

  /**
   * 내부 서버 에러 발생 시 사용하는 팩토리 메서드.
   * @param customMessage - 커스텀 에러 메시지 (선택)
   * @param details - 추가 에러 상세 정보 (선택)
   * @returns HTTP 500 상태의 BusinessException
   */
  static internalError(
    customMessage?: string,
    details?: any,
  ): BusinessException {
    return new BusinessException(
      ErrorCode.INTERNAL_SERVER_ERROR,
      customMessage,
      HttpStatus.INTERNAL_SERVER_ERROR,
      details,
    );
  }
}
