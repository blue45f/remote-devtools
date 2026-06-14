import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationEntity, type OrganizationPlan } from '@remote-platform/entity';

import type { AuthClaims } from './auth.service';
import type { Request } from 'express';
import type { Repository } from 'typeorm';

export type Plan = 'free' | 'starter' | 'pro';

/**
 * Plan tiers in ascending order. A user on tier N may access any route
 * gated by tier ≤ N. Adding tiers (e.g. "enterprise") goes here.
 */
const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

const PLAN_META_KEY = 'rd:requiredPlan';

function toPlan(value: unknown): OrganizationPlan | null {
  if (value === 'free' || value === 'starter' || value === 'pro') {
    return value;
  }
  return null;
}

function organizationPlanFromClaims(plan: unknown): OrganizationPlan | null {
  return toPlan(plan);
}

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
  private readonly logger = new Logger(PlanGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Plan | undefined>(PLAN_META_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true; // unannotated route

    const req = context.switchToHttp().getRequest<Request & { auth?: AuthClaims }>();
    const orgPlan = await this.getPlanByOrganization(req.auth?.org);
    const claimPlan = organizationPlanFromClaims(req.auth?.plan);
    if (!orgPlan && req.auth?.plan !== undefined && !claimPlan) {
      throw new ForbiddenException(`Invalid plan claim "${req.auth?.plan}" on this token.`);
    }
    const callerPlan = orgPlan ?? claimPlan;

    // No claims at all → AuthGuard didn't run or is disabled. We do not want
    // to block self-host single-tenant deployments, so allow through.
    if (!callerPlan) return true;

    const callerRank = PLAN_RANK[callerPlan] ?? -1;
    const requiredRank = PLAN_RANK[required];
    if (callerRank < requiredRank) {
      throw new ForbiddenException(`This endpoint requires the "${required}" plan or higher`);
    }
    return true;
  }

  private async getPlanByOrganization(orgId?: string): Promise<OrganizationPlan | null> {
    const normalizedOrgId = orgId?.trim();
    if (!normalizedOrgId) {
      return null;
    }

    const repository = this.moduleRef.get<Repository<OrganizationEntity> | undefined>(
      getRepositoryToken(OrganizationEntity),
      { strict: false },
    );
    if (!repository) {
      return null;
    }

    try {
      const organization = await repository.findOne({
        where: [{ id: normalizedOrgId }, { slug: normalizedOrgId }],
      });
      return organization?.plan ? toPlan(organization.plan) : null;
    } catch (error) {
      this.logger.warn(
        `[PLAN_GUARD] failed to load organization plan for org "${normalizedOrgId}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
