import { HttpStatus } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { QueryFailedExceptionFilter } from "./query-failed-exception.filter";

describe("QueryFailedExceptionFilter", () => {
  let filter: QueryFailedExceptionFilter;
  let mockResponse: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  let mockHost: any;

  beforeEach(() => {
    filter = new QueryFailedExceptionFilter();
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

  it("should handle duplicate slack_id constraint", () => {
    const error = new QueryFailedError(
      "INSERT INTO user",
      [],
      new Error(
        'duplicate key value violates unique constraint "UQ_slack_id" Key (slack_id)=(U12345) already exists',
      ),
    );

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining("U12345"),
        }),
      }),
    );
  });

  it("should handle duplicate emp_no constraint", () => {
    const error = new QueryFailedError(
      "INSERT INTO user",
      [],
      new Error(
        'duplicate key value violates unique constraint "UQ_emp_no" Key (emp_no)=(22010083) already exists',
      ),
    );

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining("22010083"),
        }),
      }),
    );
  });

  it("should handle duplicate device_id constraint", () => {
    const error = new QueryFailedError(
      "INSERT INTO device_info",
      [],
      new Error(
        'duplicate key value violates unique constraint "UQ_device_id" Key (device_id)=(ABC123) already exists',
      ),
    );

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining("ABC123"),
        }),
      }),
    );
  });

  it("should handle generic duplicate key", () => {
    const error = new QueryFailedError(
      "INSERT INTO record",
      [],
      new Error("duplicate key value violates unique constraint some_other_field"),
    );

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining("Duplicate data detected"),
        }),
      }),
    );
  });

  it("should handle foreign key constraint violation", () => {
    const error = new QueryFailedError(
      "DELETE FROM user",
      [],
      new Error("violates foreign key constraint"),
    );

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: "Referenced data does not exist",
        }),
      }),
    );
  });

  it("should handle not-null constraint violation", () => {
    const error = new QueryFailedError(
      "INSERT INTO user",
      [],
      new Error("violates not-null constraint"),
    );

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: "Required field is missing",
        }),
      }),
    );
  });

  it("should handle unknown database error", () => {
    const error = new QueryFailedError(
      "SELECT *",
      [],
      new Error("connection refused"),
    );

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "DATABASE_ERROR",
        }),
      }),
    );
  });
});
