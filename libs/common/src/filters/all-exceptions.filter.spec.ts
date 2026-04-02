import type { ArgumentsHost } from "@nestjs/common";
import { HttpException, HttpStatus } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { BusinessException } from "../exceptions/business.exception";
import { ErrorCode } from "../exceptions/error-codes.enum";

import { AllExceptionsFilter } from "./all-exceptions.filter";

function createMockHost(url = "/test"): ArgumentsHost {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const mockRequest = { url, method: "GET" };

  return {
    getType: () => "http",
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  } as unknown as ArgumentsHost;
}

function getResponseJson(host: ArgumentsHost): Record<string, unknown> {
  const response = host.switchToHttp().getResponse() as any;
  return response.json.mock.calls[0][0];
}

function getResponseStatus(host: ArgumentsHost): number {
  const response = host.switchToHttp().getResponse() as any;
  return response.status.mock.calls[0][0];
}

describe("AllExceptionsFilter", () => {
  describe("default mode", () => {
    let filter: AllExceptionsFilter;

    beforeEach(() => {
      filter = new AllExceptionsFilter();
    });

    it("should handle BusinessException", () => {
      const host = createMockHost("/api/test");
      const exception = BusinessException.validationFailed("Bad input");

      filter.catch(exception, host);

      expect(getResponseStatus(host)).toBe(HttpStatus.BAD_REQUEST);
      const json = getResponseJson(host);
      expect(json.errorCode).toBe(ErrorCode.VALIDATION_FAILED);
      expect(json.path).toBe("/api/test");
    });

    it("should handle standard HttpException", () => {
      const host = createMockHost("/api/test");
      const exception = new HttpException("Forbidden", HttpStatus.FORBIDDEN);

      filter.catch(exception, host);

      expect(getResponseStatus(host)).toBe(HttpStatus.FORBIDDEN);
      const json = getResponseJson(host);
      expect(json.message).toBe("Forbidden");
    });

    it("should handle HttpException with object response", () => {
      const host = createMockHost();
      const exception = new HttpException(
        { message: "Not Found", statusCode: 404 },
        HttpStatus.NOT_FOUND,
      );

      filter.catch(exception, host);

      expect(getResponseStatus(host)).toBe(HttpStatus.NOT_FOUND);
      const json = getResponseJson(host);
      expect(json.message).toBe("Not Found");
    });

    it("should handle unknown errors", () => {
      const host = createMockHost();
      const exception = new Error("Something broke");

      filter.catch(exception, host);

      expect(getResponseStatus(host)).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      const json = getResponseJson(host);
      expect(json.message).toBe("Something broke");
      expect(json.errorCode).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    });

    it("should handle non-Error exceptions", () => {
      const host = createMockHost();

      filter.catch("string error", host);

      expect(getResponseStatus(host)).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      const json = getResponseJson(host);
      expect(json.message).toBe("An unknown error occurred.");
    });
  });

  describe("SDK-compatible mode", () => {
    let filter: AllExceptionsFilter;

    beforeEach(() => {
      filter = new AllExceptionsFilter({ sdkCompatible: true });
    });

    it("should wrap error in SDK-compatible format", () => {
      const host = createMockHost();
      const exception = BusinessException.validationFailed("Bad input");

      filter.catch(exception, host);

      const json = getResponseJson(host);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
      expect((json.error as any).code).toBe(ErrorCode.VALIDATION_FAILED);
      expect((json.error as any).message).toBe("Bad input");
    });
  });
});
