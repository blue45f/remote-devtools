import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { Auth } from "../auth/auth.decorator";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthClaims } from "../auth/auth.service";

import {
  ActivityEntry,
  ActivityPage,
  ActivityService,
} from "./activity.service";

@ApiTags("Activity")
@Controller("api/activity")
@UseGuards(AuthGuard) // no-op when AUTH_JWT_SECRET / PUBLIC_KEY env are unset
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * GET /api/activity/feed?limit=20[&orgId=...][&before=ISO]
   * Returns the most recent platform activity (session + ticket events) for
   * the dashboard's real-time feed panel.
   *
   * Pagination:
   *   - No `before` param → bare `ActivityEntry[]` for back-compat with the
   *     existing dashboard.
   *   - `before=ISO` → `{rows, nextCursor}` envelope for "Load more older".
   *
   * Tenant scope precedence:
   *   1. JWT `org` claim (when auth is enabled)
   *   2. `?orgId=` query param (operator override / dev tooling)
   *   3. unscoped — returns the global feed (self-host single-tenant)
   */
  @Get("feed")
  public async getFeed(
    @Auth() auth: AuthClaims | null,
    @Query("limit") limit?: string,
    @Query("orgId") orgId?: string,
    @Query("before") before?: string,
  ): Promise<ActivityEntry[] | ActivityPage> {
    const parsed = limit ? Number(limit) : 20;
    const safeLimit = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), 100)
      : 20;
    const scope = auth?.org ?? orgId ?? null;
    const page = await this.activityService.getFeedPage(
      safeLimit,
      scope,
      before ?? null,
    );
    if (!before) return page.rows; // back-compat
    return page;
  }
}
