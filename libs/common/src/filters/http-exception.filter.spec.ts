import {
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from "@nestjs/common";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;
  let mockResponse: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  let mockHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    };
  });

  it("should map BAD_REQUEST to VALIDATION_ERROR", () => {
    filter.catch(new BadRequestException("Invalid input"), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
      }),
    );
  });

  it("should map NOT_FOUND to NOT_FOUND", () => {
    filter.catch(new NotFoundException("Resource not found"), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "NOT_FOUND" }),
      }),
    );
  });

  it("should map CONFLICT to CONFLICT_ERROR", () => {
    filter.catch(new ConflictException("Duplicate entry"), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "CONFLICT_ERROR" }),
      }),
    );
  });

  it("should map INTERNAL_SERVER_ERROR to INTERNAL_ERROR", () => {
    filter.catch(
      new InternalServerErrorException("Server error"),
      mockHost,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
      }),
    );
  });

  it("should map unmapped status to UNKNOWN_ERROR", () => {
    filter.catch(new ForbiddenException("Access denied"), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "UNKNOWN_ERROR" }),
      }),
    );
  });

  it("should include exception message in response", () => {
    filter.catch(new BadRequestException("empNo is required"), mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "empNo is required",
        }),
      }),
    );
  });
});
