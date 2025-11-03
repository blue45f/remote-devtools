import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from "@nestjs/common";
import { Request, Response } from "express";

import {
  BusinessException,
  BusinessErrorResponse,
} from "../exceptions/business.exception";
import { ErrorCode } from "../exceptions/error-codes.enum";

/**
 * 예외 필터 옵션을 주입하기 위한 프로바이더 토큰.
 */
export const EXCEPTION_FILTER_OPTIONS = "EXCEPTION_FILTER_OPTIONS";

/**
 * 예외 필터의 동작을 설정하는 옵션 인터페이스.
 */
export interface ExceptionFilterOptions {
  /** SDK 호환 형식({ success, error: { code, message } })으로 에러 응답을 래핑할지 여부 */
  sdkCompatible?: boolean;
}

/**
 * 모든 예외를 포착하여 표준화된 에러 응답으로 변환하는 전역 예외 필터.
 * BusinessException, HttpException, 알 수 없는 예외 세 가지 분기를 처리한다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly options: ExceptionFilterOptions;

  /**
   * AllExceptionsFilter 인스턴스를 생성한다.
   * @param options - 예외 필터 옵션 (선택). 주입되지 않으면 기본값 사용.
   */
  constructor(
    @Optional()
    @Inject(EXCEPTION_FILTER_OPTIONS)
    options?: ExceptionFilterOptions,
  ) {
    this.options = options ?? {};
  }

  /**
   * 발생한 예외를 포착하여 적절한 에러 응답을 생성한다.
   *
   * 세 가지 분기로 처리한다:
   * 1. BusinessException: 비즈니스 로직 에러로, 예외에 포함된 응답 정보를 그대로 사용한다.
   * 2. HttpException: 일반 HTTP 예외로, errorCode가 있으면 그대로 사용하고 없으면 HTTP 상태 코드를 에러 코드로 매핑한다.
   * 3. 알 수 없는 예외: 내부 서버 에러(500)로 처리하고 에러 스택을 로깅한다.
   *
   * sdkCompatible 옵션이 활성화된 경우 SDK 호환 형식으로 응답을 래핑한다.
   *
   * @param exception - 발생한 예외 객체
   * @param host - NestJS ArgumentsHost (HTTP 컨텍스트 접근용)
   */
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === "ws") {
      const errorMessage =
        exception instanceof Error
          ? exception.message
          : "An unknown error occurred.";
      this.logger.error(
        `WebSocket Exception: ${JSON.stringify({
          message: errorMessage,
          stack: exception instanceof Error ? exception.stack : undefined,
        })}`,
      );
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let errorResponse: BusinessErrorResponse;
    let status: number;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const exceptionResponse =
        exception.getResponse() as BusinessErrorResponse;
      errorResponse = {
        ...exceptionResponse,
        path: request.url,
      };

      this.logger.warn(
        `Business Exception: ${JSON.stringify({
          errorCode: exceptionResponse.errorCode,
          message: exceptionResponse.message,
          path: request.url,
          method: request.method,
          details: exceptionResponse.details,
        })}`,
      );
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === "object" &&
        "errorCode" in exceptionResponse
      ) {
        errorResponse = exceptionResponse as BusinessErrorResponse;
        errorResponse.path = request.url;
      } else {
        const message =
          typeof exceptionResponse === "string"
            ? exceptionResponse
            : (exceptionResponse as any).message ||
              "An error occurred while processing the request.";

        errorResponse = {
          statusCode: status,
          errorCode: this.mapHttpStatusToErrorCode(status),
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      this.logger.warn(
        `HTTP Exception: ${JSON.stringify({
          status,
          message: errorResponse.message,
          path: request.url,
          method: request.method,
        })}`,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage =
        exception instanceof Error
          ? exception.message
          : "An unknown error occurred.";

      errorResponse = {
        statusCode: status,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      this.logger.error(
        `Unexpected Error: ${JSON.stringify({
          message: errorMessage,
          stack: exception instanceof Error ? exception.stack : undefined,
          path: request.url,
          method: request.method,
        })}`,
      );
    }

    if (this.options.sdkCompatible) {
      response.status(status).json({
        success: false,
        error: {
          code: errorResponse.errorCode,
          message: errorResponse.message,
        },
        errorCode: errorResponse.errorCode,
        message: errorResponse.message,
        timestamp: errorResponse.timestamp,
        path: errorResponse.path,
      });
    } else {
      response.status(status).json(errorResponse);
    }
  }

  /**
   * HTTP 상태 코드를 애플리케이션 에러 코드(ErrorCode)로 매핑한다.
   * @param status - 매핑할 HTTP 상태 코드
   * @returns 대응하는 ErrorCode (매핑이 없으면 INTERNAL_SERVER_ERROR 반환)
   */
  private mapHttpStatusToErrorCode(status: HttpStatus): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.AUTH_UNAUTHORIZED;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.INTERNAL_SERVER_ERROR;
      case HttpStatus.REQUEST_TIMEOUT:
        return ErrorCode.TIMEOUT_ERROR;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}
