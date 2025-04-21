import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
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
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 디버깅을 위한 전체 에러 로깅
    console.error("[DATABASE ERROR]", exception.message);
    console.error("[DATABASE ERROR Detail]", exception);

    // PostgreSQL 제약 조건 위반 에러 메시지 파싱
    let userFriendlyMessage = exception.message;
    let statusCode = HttpStatus.CONFLICT;

    if (
      exception.message.includes(
        "duplicate key value violates unique constraint",
      )
    ) {
      // 슬랙 ID 중복
      if (exception.message.includes("slack_id")) {
        const slackIdMatch = exception.message.match(
          /Key \(slack_id\)=\(([^)]+)\)/,
        );
        const slackId = slackIdMatch ? slackIdMatch[1] : "unknown";
        userFriendlyMessage = `Slack ID '${slackId}' already exists`;
      }
      // 사번 중복
      else if (exception.message.includes("emp_no")) {
        const empNoMatch = exception.message.match(
          /Key \(emp_no\)=\(([^)]+)\)/,
        );
        const empNo = empNoMatch ? empNoMatch[1] : "unknown";
        userFriendlyMessage = `Employee number '${empNo}' already exists`;
      }
      // 디바이스 ID 중복
      else if (exception.message.includes("device_id")) {
        const deviceMatch = exception.message.match(
          /Key \(device_id\)=\(([^)]+)\)/,
        );
        const deviceId = deviceMatch ? deviceMatch[1] : "unknown";
        userFriendlyMessage = `Device ID '${deviceId}' already exists`;
      }
      // 기타 중복
      else {
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
