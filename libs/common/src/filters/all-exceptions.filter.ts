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

export const EXCEPTION_FILTER_OPTIONS = "EXCEPTION_FILTER_OPTIONS";

export interface ExceptionFilterOptions {
  /** Wrap error responses in SDK-compatible format ({ success, error: { code, message } }) */
  sdkCompatible?: boolean;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly options: ExceptionFilterOptions;

  constructor(
    @Optional()
    @Inject(EXCEPTION_FILTER_OPTIONS)
    options?: ExceptionFilterOptions,
  ) {
    this.options = options ?? {};
  }

  catch(exception: unknown, host: ArgumentsHost) {
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
