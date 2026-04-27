import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let original: { secret?: string; pub?: string; env?: string };
  let svc: AuthService;

  beforeEach(() => {
    original = {
      secret: process.env.AUTH_JWT_SECRET,
      pub: process.env.AUTH_JWT_PUBLIC_KEY,
      env: process.env.NODE_ENV,
    };
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.AUTH_JWT_PUBLIC_KEY;
    svc = new AuthService();
  });

  afterEach(() => {
    if (original.secret === undefined) delete process.env.AUTH_JWT_SECRET;
    else process.env.AUTH_JWT_SECRET = original.secret;
    if (original.pub === undefined) delete process.env.AUTH_JWT_PUBLIC_KEY;
    else process.env.AUTH_JWT_PUBLIC_KEY = original.pub;
    if (original.env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original.env;
  });

  it("is disabled when no env keys are set", () => {
    expect(svc.enabled).toBe(false);
  });

  it("is enabled when AUTH_JWT_SECRET is set", () => {
    process.env.AUTH_JWT_SECRET = "x";
    svc = new AuthService();
    expect(svc.enabled).toBe(true);
  });

  it("issues + verifies dev tokens (HS256)", () => {
    process.env.AUTH_JWT_SECRET = "test-secret";
    svc = new AuthService();
    const token = svc.issueDevToken({
      sub: "user-1",
      org: "org-1",
      plan: "starter",
      email: "a@b.com",
    });
    expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    const claims = svc.verify(token);
    expect(claims.sub).toBe("user-1");
    expect(claims.org).toBe("org-1");
    expect(claims.plan).toBe("starter");
    expect(claims.email).toBe("a@b.com");
  });

  it("rejects tampered tokens", () => {
    process.env.AUTH_JWT_SECRET = "test-secret";
    svc = new AuthService();
    const token = svc.issueDevToken({ sub: "u" });
    const tampered = token.replace(/.$/, "x");
    expect(() => svc.verify(tampered)).toThrow();
  });

  it("refuses to issue dev tokens in production", () => {
    process.env.AUTH_JWT_SECRET = "x";
    process.env.NODE_ENV = "production";
    svc = new AuthService();
    expect(() => svc.issueDevToken({ sub: "u" })).toThrow(/production/);
  });

  it("verify throws when auth is disabled", () => {
    expect(() => svc.verify("anything")).toThrow(/Auth is disabled/);
  });
});
