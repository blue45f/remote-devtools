import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import type { AuthClaims } from "./auth.service";

interface RequestWithAuth extends Request {
  auth?: AuthClaims;
}

/**
 * Controller param decorator that pulls the verified JWT claims off the
 * request. Returns `null` when auth is disabled (self-host single-tenant).
 *
 *   @Get("/widgets")
 *   list(@Auth() auth: AuthClaims | null) {
 *     return this.svc.list({ orgId: auth?.org ?? null });
 *   }
 */
export const Auth = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthClaims | null => {
    const req = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return req.auth ?? null;
  },
);
