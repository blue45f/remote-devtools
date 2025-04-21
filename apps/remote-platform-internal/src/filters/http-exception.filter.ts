import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    // 에러 코드 매핑
    const errorCodeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: "VALIDATION_ERROR",
      [HttpStatus.NOT_FOUND]: "NOT_FOUND",
      [HttpStatus.CONFLICT]: "CONFLICT_ERROR",
      [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_ERROR",
    };

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: errorCodeMap[status] || "UNKNOWN_ERROR",
        message: exception.message,
      },
    };

    response.status(status).json(errorResponse);
  }
}
