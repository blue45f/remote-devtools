import { Injectable, Logger } from "@nestjs/common";
import jwt, { type JwtPayload } from "jsonwebtoken";

/**
 * Provider-agnostic JWT signing/verification helper.
 *
 * Production deployments swap this out (or layer it under) Clerk / Supabase /
 * Auth0 / WorkOS — those providers issue JWTs that this service can verify
 * by configuring `AUTH_JWT_PUBLIC_KEY` (or shared `AUTH_JWT_SECRET` for HS256).
 *
 * In dev, no env is required: requests are unauthenticated and treated as
 * the default tenant.
 *
 * Token claims (kept minimal):
 *   sub:    user id
 *   org:    organization id (matches RecordEntity.orgId)
 *   plan:   "free" | "starter" | "pro"
 *   email:  optional, for display
 */
export interface AuthClaims extends JwtPayload {
  sub: string;
  org?: string;
  plan?: "free" | "starter" | "pro";
  email?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** True when an env var is set that lets us issue/verify tokens. */
  public get enabled(): boolean {
    return Boolean(this.secret || this.publicKey);
  }

  private get secret(): string | undefined {
    return process.env.AUTH_JWT_SECRET?.trim() || undefined;
  }

  private get publicKey(): string | undefined {
    // PEM-formatted RS256 public key from a real provider (e.g. Clerk).
    return (
      process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, "\n").trim() || undefined
    );
  }

  private get issuer(): string | undefined {
    return process.env.AUTH_JWT_ISSUER?.trim() || undefined;
  }

  /**
   * Verify a Bearer token and return its claims.
   * Throws when the token is missing/invalid/expired.
   */
  public verify(token: string): AuthClaims {
    if (!this.enabled) {
      throw new Error(
        "Auth is disabled (no AUTH_JWT_SECRET / AUTH_JWT_PUBLIC_KEY). " +
          "Set one to enable verification.",
      );
    }
    const key = this.publicKey ?? this.secret;
    if (!key) throw new Error("No JWT key configured");
    const algorithms = this.publicKey
      ? (["RS256"] as const)
      : (["HS256"] as const);
    return jwt.verify(token, key, {
      algorithms: [...algorithms],
      ...(this.issuer ? { issuer: this.issuer } : {}),
    }) as AuthClaims;
  }

  /**
   * Issues a short-lived dev token (HS256). Only available when
   * `AUTH_JWT_SECRET` is set AND `NODE_ENV !== 'production'`.
   * Real SaaS deployments should issue tokens through the chosen identity
   * provider, not this endpoint.
   */
  public issueDevToken(claims: Omit<AuthClaims, "iat" | "exp">): string {
    if (!this.secret) {
      throw new Error("Dev tokens require AUTH_JWT_SECRET");
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Dev token endpoint is disabled when NODE_ENV=production",
      );
    }
    return jwt.sign(claims, this.secret, {
      algorithm: "HS256",
      expiresIn: "12h",
      ...(this.issuer ? { issuer: this.issuer } : {}),
    });
  }
}
