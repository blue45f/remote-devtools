import { HttpException, HttpStatus } from "@nestjs/common";

import { ErrorCode, ErrorMessages } from "./error-codes.enum";

export interface BusinessErrorResponse {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  details?: any;
  timestamp: string;
  path?: string;
}

export class BusinessException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly details?: any;

  constructor(
    errorCode: ErrorCode,
    customMessage?: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: any,
  ) {
    const message =
      customMessage ||
      ErrorMessages[errorCode] ||
      "알 수 없는 오류가 발생했습니다.";

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

  // 자주 사용되는 에러 생성을 위한 정적 메서드들
  static userNotFound(details?: any): BusinessException {
    return new BusinessException(
      ErrorCode.AUTH_USER_NOT_FOUND,
      undefined,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  static deviceNotFound(details?: any): BusinessException {
    return new BusinessException(
      ErrorCode.DEVICE_NOT_FOUND,
      undefined,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  static deviceUserNotFound(details?: any): BusinessException {
    return new BusinessException(
      ErrorCode.DEVICE_USER_NOT_FOUND,
      undefined,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

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

  static resourceNotFound(
    resourceName: string,
    details?: any,
  ): BusinessException {
    return new BusinessException(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resourceName}을(를) 찾을 수 없습니다.`,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  static templateNotFound(
    templateName: string,
    details?: any,
  ): BusinessException {
    return new BusinessException(
      ErrorCode.TEMPLATE_NOT_FOUND,
      `템플릿 '${templateName}'을 찾을 수 없습니다.`,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

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
