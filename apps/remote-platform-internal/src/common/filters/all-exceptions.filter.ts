import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

import {
  BusinessException,
  BusinessErrorResponse,
} from "../exceptions/business.exception";
import { ErrorCode } from "../exceptions/error-codes.enum";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let errorResponse: BusinessErrorResponse;
    let status: number;

    if (exception instanceof BusinessException) {
      // 커스텀 비즈니스 예외 처리
      status = exception.getStatus();
      const exceptionResponse =
        exception.getResponse() as BusinessErrorResponse;
      errorResponse = {
        ...exceptionResponse,
        path: request.url,
      };

      // 비즈니스 예외는 info 레벨로 로깅 (예상된 에러)
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
      // 일반 HTTP 예외 처리
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === "object" &&
        "errorCode" in exceptionResponse
      ) {
        // errorCode가 있는 HttpException (BusinessException으로 변환되지 않은 경우)
        errorResponse = exceptionResponse as BusinessErrorResponse;
        errorResponse.path = request.url;
      } else {
        // 일반 HttpException
        const message =
          typeof exceptionResponse === "string"
            ? exceptionResponse
            : (exceptionResponse as any).message ||
              "요청 처리 중 오류가 발생했습니다.";

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
      // 예상치 못한 에러 처리
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage =
        exception instanceof Error
          ? exception.message
          : "알 수 없는 오류가 발생했습니다.";

      errorResponse = {
        statusCode: status,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      // 예상치 못한 에러는 error 레벨로 로깅
      this.logger.error(
        `Unexpected Error: ${JSON.stringify({
          message: errorMessage,
          stack: exception instanceof Error ? exception.stack : undefined,
          path: request.url,
          method: request.method,
          body: request.body,
        })}`,
      );
    }

    // 응답 전송 (SDK 호환 포맷)
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
  }

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
