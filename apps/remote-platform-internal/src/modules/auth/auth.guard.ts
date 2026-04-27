import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { AuthService, type AuthClaims } from "./auth.service";

/**
 * Provider-agnostic JWT guard.
 *
 * Behaviour:
 *  - When auth is **disabled** (no AUTH_JWT_SECRET / AUTH_JWT_PUBLIC_KEY env),
 *    the guard is a no-op — requests pass through without claims.
 *    Self-host single-tenant deployments stay frictionless.
 *  - When auth is **enabled**, every protected request must carry a valid
 *    `Authorization: Bearer <jwt>`. Verified claims are stored on
 *    `req.auth` for controllers to read.
 *
 * Apply globally:
 *   app.useGlobalGuards(new AuthGuard(authService));
 * or per-controller via `@UseGuards(AuthGuard)`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.auth.enabled) return true; // self-host bypass

    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = extractBearer(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }
    try {
      req.auth = this.auth.verify(token);
      return true;
    } catch (err) {
      throw new UnauthorizedException(
        err instanceof Error ? err.message : "Invalid token",
      );
    }
  }
}

interface RequestWithAuth extends Request {
  auth?: AuthClaims;
}

function extractBearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token?.trim() : undefined;
}
