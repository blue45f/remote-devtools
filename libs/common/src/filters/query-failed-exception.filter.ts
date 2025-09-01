import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { QueryFailedError } from "typeorm";

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

@Catch(QueryFailedError)
export class QueryFailedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Database error: ${exception.message}`);

    let userFriendlyMessage = exception.message;
    let statusCode = HttpStatus.CONFLICT;

    if (
      exception.message.includes(
        "duplicate key value violates unique constraint",
      )
    ) {
      if (exception.message.includes("slack_id")) {
        const match = exception.message.match(/Key \(slack_id\)=\(([^)]+)\)/);
        userFriendlyMessage = `Slack ID '${match?.[1] ?? "unknown"}' already exists`;
      } else if (exception.message.includes("emp_no")) {
        const match = exception.message.match(/Key \(emp_no\)=\(([^)]+)\)/);
        userFriendlyMessage = `Employee number '${match?.[1] ?? "unknown"}' already exists`;
      } else if (exception.message.includes("device_id")) {
        const match = exception.message.match(/Key \(device_id\)=\(([^)]+)\)/);
        userFriendlyMessage = `Device ID '${match?.[1] ?? "unknown"}' already exists`;
      } else {
        userFriendlyMessage = `Duplicate data detected: ${exception.message}`;
      }
    } else if (exception.message.includes("violates foreign key constraint")) {
      userFriendlyMessage = "Referenced data does not exist";
      statusCode = HttpStatus.BAD_REQUEST;
    } else if (exception.message.includes("violates not-null constraint")) {
      userFriendlyMessage = "Required field is missing";
      statusCode = HttpStatus.BAD_REQUEST;
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: userFriendlyMessage,
      },
    };

    response.status(statusCode).json(errorResponse);
  }
}
