import { HttpStatus } from "@nestjs/common";
import { describe, it, expect } from "vitest";

import { BusinessException } from "./business.exception";
import { ErrorCode, ErrorMessages } from "./error-codes.enum";

describe("BusinessException", () => {
  describe("constructor", () => {
    it("should create with error code and default message", () => {
      const ex = new BusinessException(ErrorCode.VALIDATION_FAILED);

      expect(ex).toBeInstanceOf(BusinessException);
      expect(ex.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
      expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);

      const response = ex.getResponse() as Record<string, unknown>;
      expect(response.message).toBe(ErrorMessages[ErrorCode.VALIDATION_FAILED]);
      expect(response.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
      expect(response.timestamp).toBeDefined();
    });

    it("should use custom message when provided", () => {
      const ex = new BusinessException(
        ErrorCode.VALIDATION_FAILED,
        "Custom error text",
      );

      const response = ex.getResponse() as Record<string, unknown>;
      expect(response.message).toBe("Custom error text");
    });

    it("should use custom HTTP status when provided", () => {
      const ex = new BusinessException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        undefined,
        HttpStatus.SERVICE_UNAVAILABLE,
      );

      expect(ex.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it("should include details when provided", () => {
      const details = { field: "email" };
      const ex = new BusinessException(
        ErrorCode.VALIDATION_FAILED,
        undefined,
        HttpStatus.BAD_REQUEST,
        details,
      );

      expect(ex.details).toEqual(details);
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response.details).toEqual(details);
    });

    it("should fall back to generic message for unknown error code", () => {
      const ex = new BusinessException("UNKNOWN_CODE" as ErrorCode);

      const response = ex.getResponse() as Record<string, unknown>;
      expect(response.message).toBe("An unknown error occurred.");
    });
  });

  describe("static factory methods", () => {
    it("userNotFound should return 404 with AUTH_USER_NOT_FOUND", () => {
      const ex = BusinessException.userNotFound();
      expect(ex.errorCode).toBe(ErrorCode.AUTH_USER_NOT_FOUND);
      expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it("deviceNotFound should return 404 with DEVICE_NOT_FOUND", () => {
      const ex = BusinessException.deviceNotFound({ id: "abc" });
      expect(ex.errorCode).toBe(ErrorCode.DEVICE_NOT_FOUND);
      expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(ex.details).toEqual({ id: "abc" });
    });

    it("deviceUserNotFound should return 404", () => {
      const ex = BusinessException.deviceUserNotFound();
      expect(ex.errorCode).toBe(ErrorCode.DEVICE_USER_NOT_FOUND);
      expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it("unauthorized should return 401", () => {
      const ex = BusinessException.unauthorized("No token");
      expect(ex.errorCode).toBe(ErrorCode.AUTH_UNAUTHORIZED);
      expect(ex.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response.message).toBe("No token");
    });

    it("validationFailed should return 400", () => {
      const ex = BusinessException.validationFailed("Bad input");
      expect(ex.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
      expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it("resourceNotFound should include resource name in message", () => {
      const ex = BusinessException.resourceNotFound("Record");
      expect(ex.errorCode).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response.message).toBe("Record not found.");
    });

    it("templateNotFound should include template name in message", () => {
      const ex = BusinessException.templateNotFound("BugReport");
      expect(ex.errorCode).toBe(ErrorCode.TEMPLATE_NOT_FOUND);
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response.message).toBe("Template 'BugReport' not found.");
    });

    it("jiraError should return 503", () => {
      const ex = BusinessException.jiraError(
        ErrorCode.JIRA_CONNECTION_FAILED,
        "Timeout",
      );
      expect(ex.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it("slackError should return 503", () => {
      const ex = BusinessException.slackError(
        ErrorCode.SLACK_CONNECTION_FAILED,
      );
      expect(ex.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it("internalError should return 500", () => {
      const ex = BusinessException.internalError("DB crash");
      expect(ex.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(ex.errorCode).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });
  });
});
