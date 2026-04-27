import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import type { AuthClaims } from "./auth.service";

export type Plan = "free" | "starter" | "pro";

/**
 * Plan tiers in ascending order. A user on tier N may access any route
 * gated by tier ≤ N. Adding tiers (e.g. "enterprise") goes here.
 */
const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

const PLAN_META_KEY = "rd:requiredPlan";

/**
 * Decorator: gate a controller or handler behind a minimum plan tier.
 *
 *   @RequirePlan("pro")
 *   @Get("/api/billing/checkout") ...
 *
 * Behaviour with the underlying PlanGuard:
 *  - When auth is disabled (self-host), the guard is a no-op and every
 *    route is accessible — operators self-host the whole app.
 *  - When auth is enabled but the route is unannotated, also a no-op.
 *  - When annotated and the caller's claims.plan rank is below the
 *    required rank, the guard throws 403.
 *
 * Pair with `@UseGuards(AuthGuard, PlanGuard)`.
 */
export const RequirePlan = (plan: Plan) => SetMetadata(PLAN_META_KEY, plan);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Plan | undefined>(
      PLAN_META_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true; // unannotated route

    const req = context
      .switchToHttp()
      .getRequest<Request & { auth?: AuthClaims }>();
    const callerPlan = req.auth?.plan;

    // No claims at all → AuthGuard didn't run or is disabled. We do not want
    // to block self-host single-tenant deployments, so allow through.
    if (!callerPlan) return true;

    const callerRank = PLAN_RANK[callerPlan] ?? -1;
    const requiredRank = PLAN_RANK[required];
    if (callerRank < requiredRank) {
      throw new ForbiddenException(
        `This endpoint requires the "${required}" plan or higher`,
      );
    }
    return true;
  }
}
