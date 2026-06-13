import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AccountEntity,
  OrganizationEntity,
  OrganizationMemberEntity,
} from '@remote-platform/entity';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../auth/auth.service';

import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.AUTH_JWT_SECRET;
    process.env.AUTH_JWT_SECRET = 'accounts-service-test-secret';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.AUTH_JWT_SECRET;
    else process.env.AUTH_JWT_SECRET = originalSecret;
  });

  it('registers an account, organization, owner membership, and session token', async () => {
    const fixture = createFixture();

    const result = await fixture.service.register({
      email: ' Alice@Example.COM ',
      name: 'Alice',
      password: 'password123',
      organizationName: 'Acme QA',
    });

    expect(result.type).toBe('Bearer');
    expect(result.account.email).toBe('alice@example.com');
    expect(result.organization.slug).toBe('acme-qa');
    expect(result.member.role).toBe('owner');
    const claims = fixture.auth.verify(result.token);
    expect(claims).toMatchObject({
      sub: result.account.id,
      org: result.organization.id,
      member: result.member.id,
      provider: 'remote-devtools',
      role: 'owner',
    });
  });

  it('logs in active accounts and rejects suspended accounts', async () => {
    const fixture = createFixture();
    await fixture.service.register({
      email: 'owner@example.com',
      name: 'Owner',
      password: 'password123',
      organizationName: 'Owner Org',
    });

    const login = await fixture.service.login({
      email: 'OWNER@example.com',
      password: 'password123',
    });
    expect(login.account.email).toBe('owner@example.com');

    fixture.accounts[0].status = 'suspended';
    await expect(
      fixture.service.login({
        email: 'owner@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets owners invite members and prevents removing the last active owner', async () => {
    const fixture = createFixture();
    const ownerSession = await fixture.service.register({
      email: 'owner@example.com',
      name: 'Owner',
      password: 'password123',
      organizationName: 'Owner Org',
    });
    const ownerClaims = fixture.auth.verify(ownerSession.token);

    const invited = await fixture.service.inviteMember(ownerClaims, {
      email: 'member@example.com',
      name: 'Member',
      role: 'admin',
      status: 'active',
    });
    expect(invited.member.role).toBe('admin');
    expect(invited.member.account.email).toBe('member@example.com');

    await expect(
      fixture.service.removeMember(ownerClaims, ownerSession.member.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows owner removal after another active owner exists', async () => {
    const fixture = createFixture();
    const ownerSession = await fixture.service.register({
      email: 'owner@example.com',
      name: 'Owner',
      password: 'password123',
      organizationName: 'Owner Org',
    });
    const ownerClaims = fixture.auth.verify(ownerSession.token);

    await fixture.service.inviteMember(ownerClaims, {
      email: 'owner2@example.com',
      name: 'Owner Two',
      role: 'owner',
      status: 'active',
    });

    await expect(
      fixture.service.removeMember(ownerClaims, ownerSession.member.id),
    ).resolves.toEqual({
      ok: true,
    });
  });

  it('admin-deletes member accounts with anonymized account data', async () => {
    const fixture = createFixture();
    const ownerSession = await fixture.service.register({
      email: 'owner@example.com',
      name: 'Owner',
      password: 'password123',
      organizationName: 'Owner Org',
    });
    const ownerClaims = fixture.auth.verify(ownerSession.token);

    const invited = await fixture.service.inviteMember(ownerClaims, {
      email: 'member@example.com',
      name: 'Member',
      role: 'member',
      status: 'active',
    });

    const updated = await fixture.service.updateAccountForAdmin(ownerClaims, invited.member.id, {
      status: 'deleted',
    });

    expect(updated.member.status).toBe('deleted');
    expect(updated.member.account.status).toBe('deleted');
    expect(updated.member.account.email).toMatch(
      /^deleted-acct-\d+@deleted\.remote-devtools\.local$/,
    );
  });
});

function createFixture() {
  const accounts: AccountEntity[] = [];
  const organizations: OrganizationEntity[] = [];
  const members: OrganizationMemberEntity[] = [];
  const accountRepository = makeRepository<AccountEntity>(accounts, 'acct', attachRelations);
  const organizationRepository = makeRepository<OrganizationEntity>(
    organizations,
    'org',
    attachRelations,
  );
  const memberRepository = makeRepository<OrganizationMemberEntity>(
    members,
    'mem',
    attachRelations,
  );
  const auth = new AuthService(accountRepository as never, memberRepository as never);
  const service = new AccountsService(
    accountRepository as never,
    organizationRepository as never,
    memberRepository as never,
    auth,
  );

  return {
    accounts,
    organizations,
    members,
    auth,
    service,
  };

  function attachRelations<T>(entity: T): T {
    if (typeof entity === 'object' && entity !== null && 'accountId' in entity) {
      const member = entity as unknown as OrganizationMemberEntity;
      member.account = accounts.find((account) => account.id === member.accountId) as AccountEntity;
      member.organization = organizations.find(
        (organization) => organization.id === member.orgId,
      ) as OrganizationEntity;
    }
    return entity;
  }
}

function makeRepository<T extends { id?: string; createdAt?: Date; updatedAt?: Date }>(
  rows: T[],
  prefix: string,
  attachRelations: (entity: T) => T,
) {
  let sequence = 0;
  const now = () => new Date('2026-01-01T00:00:00.000Z');
  return {
    create(input: Partial<T>) {
      return input as T;
    },
    async save(input: T) {
      if (!input.id) {
        sequence += 1;
        input.id = `${prefix}-${sequence}`;
        input.createdAt = now();
      }
      input.updatedAt = now();
      const index = rows.findIndex((row) => row.id === input.id);
      if (index >= 0) rows[index] = input;
      else rows.push(input);
      return attachRelations(input);
    },
    async findOne(input: { where: Partial<T> | Partial<T>[] }) {
      const where = Array.isArray(input.where) ? input.where : [input.where];
      const found = rows.find((row) => where.some((candidate) => matches(row, candidate)));
      return found ? attachRelations(found) : null;
    },
    async find(input: { where?: Partial<T> } = {}) {
      const found = input.where ? rows.filter((row) => matches(row, input.where ?? {})) : rows;
      return found.map((row) => attachRelations(row));
    },
    async count(input: { where?: Partial<T> } = {}) {
      return input.where
        ? rows.filter((row) => matches(row, input.where ?? {})).length
        : rows.length;
    },
  };
}

function matches<T>(row: T, where: Partial<T>): boolean {
  const record = row as { [K in keyof T]?: unknown };
  return Object.entries(where).every(([key, value]) => record[key as keyof T] === value);
}
