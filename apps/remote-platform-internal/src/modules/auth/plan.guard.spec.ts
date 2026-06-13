import { ForbiddenException } from '@nestjs/common';
import { OrganizationEntity, type OrganizationPlan } from '@remote-platform/entity';
import { describe, expect, it, vi } from 'vitest';

import { PlanGuard, type Plan } from './plan.guard';

import type { AuthClaims } from './auth.service';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Repository } from 'typeorm';

interface RequestWithAuth {
  auth?: AuthClaims | null;
}

interface ModuleRefLike {
  get: (...args: unknown[]) => Repository<OrganizationEntity> | undefined;
}

function makeCtx(claims?: AuthClaims | null): ExecutionContext {
  const req: RequestWithAuth = { auth: claims };
  return {
    getHandler: () => () => undefined,
    getClass: () => class Stub {},
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

function makeReflector(required: Plan | undefined): Reflector {
  return {
    getAllAndOverride: vi.fn().mockReturnValue(required),
  } as unknown as Reflector;
}

function makeModuleRef(repository?: Repository<OrganizationEntity>): ModuleRefLike {
  return { get: () => repository };
}

function guardWith(
  required: Plan | undefined,
  repository?: Repository<OrganizationEntity>,
): PlanGuard {
  return new PlanGuard(
    makeReflector(required),
    makeModuleRef(repository) as unknown as ConstructorParameters<typeof PlanGuard>[1],
  );
}

describe('PlanGuard', () => {
  it('passes through unannotated routes', async () => {
    const guard = guardWith(undefined);
    await expect(guard.canActivate(makeCtx({ sub: 'u1' }))).resolves.toBe(true);
  });

  it('passes through when there are no claims (auth disabled / self-host)', async () => {
    const guard = guardWith('pro');
    await expect(guard.canActivate(makeCtx(undefined))).resolves.toBe(true);
  });

  it('allows callers on the same tier', async () => {
    const guard = guardWith('starter');
    await expect(
      guard.canActivate(makeCtx({ sub: 'u1', plan: 'starter' } as AuthClaims)),
    ).resolves.toBe(true);
  });

  it('allows callers on a higher tier', async () => {
    const guard = guardWith('starter');
    await expect(
      guard.canActivate(makeCtx({ sub: 'u1', plan: 'pro' } as AuthClaims)),
    ).resolves.toBe(true);
  });

  it('prefers organization plan over token plan', async () => {
    const repo = {
      findOne: vi.fn().mockResolvedValue({ plan: 'free' }),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;

    const guard = guardWith('starter', repo as Repository<OrganizationEntity>);

    await expect(
      guard.canActivate(makeCtx({ sub: 'u1', org: 'org-42', plan: 'pro' } as AuthClaims)),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect((repo.findOne as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
      { where: [{ id: 'org-42' }, { slug: 'org-42' }] },
    ]);
  });

  it('falls back to token plan when organization lookup fails', async () => {
    const repo = {
      findOne: vi.fn().mockRejectedValue(new Error('organization lookup failed')),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;
    const guard = guardWith('starter', repo as Repository<OrganizationEntity>);

    await expect(
      guard.canActivate(makeCtx({ sub: 'u1', org: 'org-42', plan: 'starter' } as AuthClaims)),
    ).resolves.toBe(true);
  });

  it('forbids callers below the required tier', async () => {
    const guard = guardWith('pro');
    await expect(
      guard.canActivate(makeCtx({ sub: 'u1', plan: 'starter' } as AuthClaims)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids callers with an unknown plan label', async () => {
    const guard = guardWith('starter');
    await expect(
      guard.canActivate(makeCtx({ sub: 'u1', plan: 'garbage' as unknown as OrganizationPlan })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('loads organization plan when repository returns it', async () => {
    const repo = {
      findOne: vi.fn().mockResolvedValue({ plan: 'pro' }),
    } as Pick<Repository<OrganizationEntity>, 'findOne'>;

    const guard = guardWith('starter', repo as Repository<OrganizationEntity>);

    await expect(
      guard.canActivate(makeCtx({ sub: 'u1', org: '  org-42  ', plan: 'free' } as AuthClaims)),
    ).resolves.toBe(true);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: [{ id: 'org-42' }, { slug: 'org-42' }],
    });
  });
});
