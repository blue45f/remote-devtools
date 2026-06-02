import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';

interface DevTokenBody {
  sub?: string;
  org?: string;
  plan?: 'free' | 'starter' | 'pro';
  email?: string;
}

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * GET /api/auth/status
   * Public probe so the frontend can decide whether to redirect
   * unauthenticated users to /sign-in. Returns:
   *   { enabled: boolean }
   * No claims are leaked here — it's just a feature flag.
   */
  @Get('status')
  @ApiResponse({ status: 200, description: 'Returns auth enabled flag.' })
  public status() {
    return { enabled: this.auth.enabled };
  }

  /**
   * POST /api/auth/dev-token
   * Issues a short-lived JWT for development. Disabled in production —
   * production should issue tokens via Clerk / Supabase / Auth0 / WorkOS.
   *
   * Body (all optional):
   *   sub:   user id    (default: "dev-user")
   *   org:   org id     (default: "dev-org")
   *   plan:  free|starter|pro (default: "free")
   *   email: string
   */
  @Post('dev-token')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Returns signed Bearer JWT.' })
  @ApiResponse({ status: 400, description: 'Dev tokens disabled in production.' })
  @ApiResponse({ status: 503, description: 'Auth not configured; JWT secret missing.' })
  public issueDevToken(@Body() body: DevTokenBody) {
    if (!this.auth.enabled) {
      throw new ServiceUnavailableException(
        'Auth is disabled. Set AUTH_JWT_SECRET to enable dev tokens.',
      );
    }
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Dev tokens are not issued in production');
    }
    const token = this.auth.issueDevToken({
      sub: body.sub ?? 'dev-user',
      org: body.org ?? 'dev-org',
      plan: body.plan ?? 'free',
      email: body.email,
    });
    return { token, type: 'Bearer' };
  }
}
