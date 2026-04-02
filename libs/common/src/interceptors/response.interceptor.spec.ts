import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { of, firstValueFrom } from "rxjs";
import { describe, it, expect, beforeEach } from "vitest";

import type { StandardResponse } from "./response.interceptor";
import { ResponseInterceptor } from "./response.interceptor";

describe("ResponseInterceptor", () => {
  let interceptor: ResponseInterceptor<unknown>;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ url: "/api/test" }),
      }),
    } as unknown as ExecutionContext;
  });

  it("should wrap plain data in StandardResponse", async () => {
    const data = { id: 1, name: "test" };
    const mockCallHandler: CallHandler = { handle: () => of(data) };

    const result = await firstValueFrom(
      interceptor.intercept(mockExecutionContext, mockCallHandler),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.path).toBe("/api/test");
    expect(result.timestamp).toBeDefined();
    expect(typeof result.time).toBe("number");
  });

  it("should pass through data that already has success property", async () => {
    const data = { success: true, customField: "value" };
    const mockCallHandler: CallHandler = { handle: () => of(data) };

    const result = (await firstValueFrom(
      interceptor.intercept(mockExecutionContext, mockCallHandler),
    )) as StandardResponse<unknown> & { customField?: string };

    expect(result.success).toBe(true);
    expect(result.customField).toBe("value");
    expect(result.timestamp).toBeDefined();
    expect(result.path).toBe("/api/test");
    expect(result.time).toBeUndefined();
  });

  it("should handle null data", async () => {
    const mockCallHandler: CallHandler = { handle: () => of(null) };

    const result = await firstValueFrom(
      interceptor.intercept(mockExecutionContext, mockCallHandler),
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});
