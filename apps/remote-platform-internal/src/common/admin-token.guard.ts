import { createHash, timingSafeEqual } from 'crypto';

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import type { Request } from 'express';

/**
 * Optional admin token guard for self-hosted deployments.
 *
 * If the `ADMIN_TOKEN` env var is set, every request to a protected route
 * must include a matching `Authorization: Bearer <token>` header (or
 * `?admin_token=<token>` for quick browser checks). When unset the guard is
 * a no-op so local development / Docker compose stays frictionless.
 *
 * Apply globally with:
 *   app.useGlobalGuards(new AdminTokenGuard());
 * or per-controller / per-route via `@UseGuards(AdminTokenGuard)`.
 */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_TOKEN?.trim();
    if (!expected) return true; // disabled in dev

    const req = context.switchToHttp().getRequest<Request>();
    const provided =
      extractBearer(req.headers.authorization) ??
      (typeof req.query.admin_token === 'string' ? req.query.admin_token : '');

    if (!safeCompareTokens(provided, expected)) {
      throw new UnauthorizedException('Invalid admin token');
    }
    return true;
  }
}

/**
 * Constant-time token comparison.
 *
 * The raw tokens may differ in length, so we hash both inputs to a fixed-size
 * digest before passing them to `timingSafeEqual`. This avoids leaking timing
 * information about the expected token's length or shared prefix.
 */
function safeCompareTokens(provided: string, expected: string): boolean {
  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

function extractBearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token?.trim() : undefined;
}
