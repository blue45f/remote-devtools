import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AdminTokenGuard } from "./admin-token.guard";

function ctx(
  headers: Record<string, string> = {},
  query: Record<string, string> = {},
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, query }),
    }),
  } as unknown as ExecutionContext;
}

describe("AdminTokenGuard", () => {
  let original: string | undefined;
  beforeEach(() => {
    original = process.env.ADMIN_TOKEN;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_TOKEN;
    else process.env.ADMIN_TOKEN = original;
  });

  it("is a no-op when ADMIN_TOKEN is unset", () => {
    delete process.env.ADMIN_TOKEN;
    const guard = new AdminTokenGuard();
    expect(guard.canActivate(ctx())).toBe(true);
  });

  it("accepts a matching Bearer token", () => {
    process.env.ADMIN_TOKEN = "secret";
    const guard = new AdminTokenGuard();
    expect(guard.canActivate(ctx({ authorization: "Bearer secret" }))).toBe(
      true,
    );
  });

  it("accepts a matching ?admin_token= query parameter", () => {
    process.env.ADMIN_TOKEN = "secret";
    const guard = new AdminTokenGuard();
    expect(guard.canActivate(ctx({}, { admin_token: "secret" }))).toBe(true);
  });

  it("rejects a missing token", () => {
    process.env.ADMIN_TOKEN = "secret";
    const guard = new AdminTokenGuard();
    expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException);
  });

  it("rejects a wrong token", () => {
    process.env.ADMIN_TOKEN = "secret";
    const guard = new AdminTokenGuard();
    expect(() =>
      guard.canActivate(ctx({ authorization: "Bearer wrong" })),
    ).toThrow(UnauthorizedException);
  });

  it("ignores non-Bearer auth schemes", () => {
    process.env.ADMIN_TOKEN = "secret";
    const guard = new AdminTokenGuard();
    expect(() =>
      guard.canActivate(ctx({ authorization: "Basic c2VjcmV0" })),
    ).toThrow(UnauthorizedException);
  });
});
