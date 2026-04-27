import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import type { AuthClaims } from "./auth.service";
import { PlanGuard, type Plan } from "./plan.guard";

function makeCtx(claims?: AuthClaims): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class Stub {},
    switchToHttp: () => ({
      getRequest: () => ({ auth: claims }),
    }),
  } as unknown as ExecutionContext;
}

function makeReflector(required: Plan | undefined): Reflector {
  return {
    getAllAndOverride: vi.fn().mockReturnValue(required),
  } as unknown as Reflector;
}

describe("PlanGuard", () => {
  it("passes through unannotated routes", () => {
    const guard = new PlanGuard(makeReflector(undefined));
    expect(guard.canActivate(makeCtx({ sub: "u1" }))).toBe(true);
  });

  it("passes through when there are no claims (auth disabled / self-host)", () => {
    const guard = new PlanGuard(makeReflector("pro"));
    expect(guard.canActivate(makeCtx(undefined))).toBe(true);
  });

  it("allows callers on the same tier", () => {
    const guard = new PlanGuard(makeReflector("starter"));
    expect(guard.canActivate(makeCtx({ sub: "u1", plan: "starter" }))).toBe(
      true,
    );
  });

  it("allows callers on a higher tier", () => {
    const guard = new PlanGuard(makeReflector("starter"));
    expect(guard.canActivate(makeCtx({ sub: "u1", plan: "pro" }))).toBe(true);
  });

  it("forbids callers below the required tier", () => {
    const guard = new PlanGuard(makeReflector("pro"));
    expect(() =>
      guard.canActivate(makeCtx({ sub: "u1", plan: "starter" })),
    ).toThrow(ForbiddenException);
  });

  it("forbids callers with an unknown plan label", () => {
    const guard = new PlanGuard(makeReflector("starter"));
    expect(() =>
      guard.canActivate(
        makeCtx({ sub: "u1", plan: "garbage" as unknown as Plan }),
      ),
    ).toThrow(ForbiddenException);
  });
});
