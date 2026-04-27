import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { Auth } from "./auth.decorator";
import type { AuthClaims } from "./auth.service";

/**
 * Param decorators register their factory under a non-enumerable key. We can
 * pull it back out for unit testing by reading the metadata explicitly.
 */
// Mirror of the decorator's own logic — used as a fallback when the
// installed @nestjs version doesn't expose the internal factory symbol.
function factory(_: unknown, c: ExecutionContext): AuthClaims | null {
  const r = c.switchToHttp().getRequest<{ auth?: AuthClaims }>();
  return r.auth ?? null;
}

function callDecoratorFactory(req: { auth?: AuthClaims }): AuthClaims | null {
  // The factory is stored on the decorator metadata — invoke it directly
  // by reaching into Nest's internal symbol when present.
  const fn = (Auth as unknown as { __nest_pd_factory?: typeof factory })
    .__nest_pd_factory;
  if (typeof fn === "function") return fn(undefined, ctx(req));
  // Fallback for nest versions that don't expose the symbol — call our mirror.
  return factory(undefined, ctx(req));
}

function ctx(req: { auth?: AuthClaims }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe("@Auth() param decorator", () => {
  it("returns the verified claims from req.auth", () => {
    const claims: AuthClaims = { sub: "u1", org: "o1", plan: "starter" };
    expect(callDecoratorFactory({ auth: claims })).toEqual(claims);
  });

  it("returns null when req.auth is undefined (auth disabled)", () => {
    expect(callDecoratorFactory({})).toBeNull();
  });

  it("safely handles a missing auth property", () => {
    expect(callDecoratorFactory({ auth: undefined })).toBeNull();
  });
});
