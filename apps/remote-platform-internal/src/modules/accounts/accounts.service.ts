import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AccountEntity,
  type AccountStatus,
  OrganizationEntity,
  OrganizationMemberEntity,
  type OrganizationMemberRole,
  type OrganizationMemberStatus,
} from '@remote-platform/entity';

import { AuthService } from '../auth/auth.service';

import type {
  AdminUpdateAccountDto,
  InviteOrganizationMemberDto,
  LoginAccountDto,
  RegisterAccountDto,
  UpdateMeDto,
  UpdateOrganizationMemberDto,
} from './accounts.dto';
import type { AuthClaims } from '../auth/auth.service';
import type { Repository } from 'typeorm';

const scrypt = promisify(scryptCallback);

type ActiveMemberContext = {
  account: AccountEntity;
  organization: OrganizationEntity;
  member: OrganizationMemberEntity;
};

type PublicAccount = {
  id: string;
  email: string;
  name: string;
  status: AccountStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PublicMember = {
  id: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  account: PublicAccount;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accounts: Repository<AccountEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizations: Repository<OrganizationEntity>,
    @InjectRepository(OrganizationMemberEntity)
    private readonly members: Repository<OrganizationMemberEntity>,
    private readonly auth: AuthService,
  ) {}

  public async register(input: RegisterAccountDto) {
    const email = normalizeEmail(input.email);
    const existing = await this.accounts.findOne({ where: { email } });
    if (existing && existing.status !== 'deleted') {
      throw new ConflictException('An active account already exists for this email.');
    }

    const orgName = input.organizationName?.trim() || `${input.name.trim()}'s workspace`;
    const slug = await this.createUniqueOrganizationSlug(
      input.organizationSlug || orgName || email.split('@')[0],
    );
    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    const organization = await this.organizations.save(
      this.organizations.create({
        slug,
        name: orgName,
        plan: 'free',
      }),
    );
    const account = await this.accounts.save(
      this.accounts.create({
        email,
        name: input.name.trim(),
        passwordHash,
        status: 'active',
        lastLoginAt: now,
      }),
    );
    const member = await this.members.save(
      this.members.create({
        orgId: organization.id,
        accountId: account.id,
        role: 'owner',
        status: 'active',
        joinedAt: now,
      }),
    );

    return this.toSession(account, organization, member);
  }

  public async login(input: LoginAccountDto) {
    const email = normalizeEmail(input.email);
    const account = await this.accounts.findOne({ where: { email } });
    if (!account || account.status === 'deleted') {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (account.status === 'suspended') {
      throw new ForbiddenException('This account is suspended.');
    }
    if (!account.passwordHash || !(await verifyPassword(input.password, account.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const membership = await this.members.findOne({
      where: { accountId: account.id, status: 'active' },
      relations: { organization: true },
      order: { createdAt: 'ASC' },
    });
    if (!membership?.organization) {
      throw new ForbiddenException('No active organization membership found.');
    }

    account.lastLoginAt = new Date();
    await this.accounts.save(account);
    return this.toSession(account, membership.organization, membership);
  }

  public async getMe(claims: AuthClaims | null) {
    if (!claims?.sub) {
      return { account: null, organization: null, member: null };
    }
    const context = await this.resolveActiveMemberContext(claims, { allowExternalClaims: true });
    if (!context) {
      return { account: null, organization: null, member: null };
    }
    return this.toAccountContext(context);
  }

  public async updateMe(claims: AuthClaims | null, input: UpdateMeDto) {
    const { account, organization, member } = await this.requireActiveMemberContext(claims);
    if (input.name !== undefined) {
      account.name = input.name.trim();
    }
    if (input.password !== undefined) {
      account.passwordHash = await hashPassword(input.password);
    }
    await this.accounts.save(account);
    return this.toAccountContext({ account, organization, member });
  }

  public async withdrawMe(claims: AuthClaims | null) {
    const { account, organization, member } = await this.requireActiveMemberContext(claims);
    await this.assertNotLastActiveOwner(member, {
      action: 'withdraw the last active owner from this organization',
    });

    account.status = 'deleted';
    account.deletedAt = new Date();
    account.email = anonymizeEmail(account);
    account.name = 'Deleted account';
    account.passwordHash = null;
    member.status = 'deleted';
    member.deletedAt = account.deletedAt;
    await this.members.save(member);
    await this.accounts.save(account);

    return {
      ok: true,
      organization: this.toPublicOrganization(organization),
    };
  }

  public async listMembers(claims: AuthClaims | null): Promise<{ members: PublicMember[] }> {
    const context = await this.requireManagerContext(claims);
    const members = await this.members.find({
      where: { orgId: context.member.orgId },
      relations: { account: true },
      order: { createdAt: 'ASC' },
    });
    return {
      members: members.map((member) => this.toPublicMember(member)),
    };
  }

  public async inviteMember(claims: AuthClaims | null, input: InviteOrganizationMemberDto) {
    const context = await this.requireManagerContext(claims);
    const email = normalizeEmail(input.email);
    const now = new Date();
    let account = await this.accounts.findOne({ where: { email } });
    if (!account) {
      account = await this.accounts.save(
        this.accounts.create({
          email,
          name: input.name?.trim() || email,
          passwordHash: null,
          status: 'active',
        }),
      );
    } else if (account.status === 'deleted') {
      account.status = 'active';
      account.deletedAt = null;
      account.name = input.name?.trim() || account.name;
      await this.accounts.save(account);
    } else if (input.name !== undefined) {
      account.name = input.name.trim();
      await this.accounts.save(account);
    }

    let member = await this.members.findOne({
      where: { orgId: context.member.orgId, accountId: account.id },
      relations: { account: true },
    });
    if (!member) {
      member = this.members.create({
        orgId: context.member.orgId,
        accountId: account.id,
        role: input.role ?? 'member',
        status: input.status ?? 'invited',
        invitedAt: now,
        joinedAt: input.status === 'active' ? now : null,
        account,
      });
    } else {
      await this.assertMemberMutationAllowed(member, {
        nextRole: input.role,
        nextStatus: input.status,
      });
      member.role = input.role ?? member.role;
      member.status = input.status ?? member.status;
      member.deletedAt = member.status === 'deleted' ? now : null;
      member.joinedAt = member.status === 'active' ? (member.joinedAt ?? now) : member.joinedAt;
      member.account = account;
    }

    const saved = await this.members.save(member);
    saved.account = account;
    return { member: this.toPublicMember(saved) };
  }

  public async updateMember(
    claims: AuthClaims | null,
    memberId: string,
    input: UpdateOrganizationMemberDto,
  ) {
    const context = await this.requireManagerContext(claims);
    const member = await this.members.findOne({
      where: { id: memberId, orgId: context.member.orgId },
      relations: { account: true },
    });
    if (!member) {
      throw new NotFoundException('Organization member not found.');
    }

    await this.assertMemberMutationAllowed(member, {
      nextRole: input.role,
      nextStatus: input.status,
    });

    if (input.name !== undefined && member.account) {
      member.account.name = input.name.trim();
      await this.accounts.save(member.account);
    }
    if (input.role !== undefined) {
      member.role = input.role;
    }
    if (input.status !== undefined) {
      member.status = input.status;
      member.deletedAt = input.status === 'deleted' ? new Date() : null;
      member.joinedAt =
        input.status === 'active' ? (member.joinedAt ?? new Date()) : member.joinedAt;
    }

    const saved = await this.members.save(member);
    return { member: this.toPublicMember(saved) };
  }

  public async removeMember(claims: AuthClaims | null, memberId: string) {
    const context = await this.requireManagerContext(claims);
    const member = await this.members.findOne({
      where: { id: memberId, orgId: context.member.orgId },
      relations: { account: true },
    });
    if (!member) {
      throw new NotFoundException('Organization member not found.');
    }
    await this.assertMemberMutationAllowed(member, { nextStatus: 'deleted' });

    member.status = 'deleted';
    member.deletedAt = new Date();
    await this.members.save(member);
    return { ok: true };
  }

  public async updateAccountForAdmin(
    claims: AuthClaims | null,
    memberId: string,
    input: AdminUpdateAccountDto,
  ) {
    const context = await this.requireManagerContext(claims);
    const member = await this.members.findOne({
      where: { id: memberId, orgId: context.member.orgId },
      relations: { account: true },
    });
    if (!member?.account) {
      throw new NotFoundException('Organization member not found.');
    }
    if (input.status === 'deleted') {
      await this.assertMemberMutationAllowed(member, { nextStatus: 'deleted' });
    }
    if (input.name !== undefined) {
      member.account.name = input.name.trim();
    }
    if (input.status !== undefined) {
      member.account.status = input.status;
      member.account.deletedAt = input.status === 'deleted' ? new Date() : null;
      if (input.status === 'deleted') {
        member.account.email = anonymizeEmail(member.account);
        member.account.name = 'Deleted account';
        member.account.passwordHash = null;
        member.status = 'deleted';
        member.deletedAt = member.account.deletedAt;
        await this.members.save(member);
      }
    }
    const saved = await this.accounts.save(member.account);
    member.account = saved;
    return { member: this.toPublicMember(member) };
  }

  private async requireActiveMemberContext(
    claims: AuthClaims | null,
  ): Promise<ActiveMemberContext> {
    const context = await this.resolveActiveMemberContext(claims);
    if (!context) {
      throw new UnauthorizedException('Authenticated account is required.');
    }
    return context;
  }

  private async requireManagerContext(claims: AuthClaims | null): Promise<ActiveMemberContext> {
    const context = await this.requireActiveMemberContext(claims);
    if (context.member.role !== 'owner' && context.member.role !== 'admin') {
      throw new ForbiddenException('Owner or admin membership is required.');
    }
    return context;
  }

  private async resolveActiveMemberContext(
    claims: AuthClaims | null,
    options: { allowExternalClaims?: boolean } = {},
  ): Promise<ActiveMemberContext | null> {
    if (!claims?.sub) {
      return null;
    }
    if (claims.provider !== 'remote-devtools' && options.allowExternalClaims) {
      return null;
    }
    if (claims.provider !== 'remote-devtools') {
      throw new UnauthorizedException('Remote DevTools account token is required.');
    }

    const account = await this.accounts.findOne({ where: { id: claims.sub } });
    if (!account || account.status !== 'active') {
      throw new UnauthorizedException('Account is not active.');
    }
    const member = await this.members.findOne({
      where: {
        id: claims.member,
        orgId: claims.org,
        accountId: account.id,
        status: 'active',
      },
      relations: { organization: true },
    });
    if (!member?.organization) {
      throw new UnauthorizedException('Organization membership is not active.');
    }
    return { account, organization: member.organization, member };
  }

  private async assertMemberMutationAllowed(
    member: OrganizationMemberEntity,
    input: {
      nextRole?: OrganizationMemberRole;
      nextStatus?: OrganizationMemberStatus;
    },
  ): Promise<void> {
    const demotesOwner =
      member.role === 'owner' && input.nextRole !== undefined && input.nextRole !== 'owner';
    const deactivatesOwner =
      member.role === 'owner' &&
      input.nextStatus !== undefined &&
      (input.nextStatus === 'deleted' || input.nextStatus === 'suspended');
    if (demotesOwner || deactivatesOwner) {
      await this.assertNotLastActiveOwner(member, {
        action: 'remove the last active owner from this organization',
      });
    }
  }

  private async assertNotLastActiveOwner(
    member: OrganizationMemberEntity,
    input: { action: string },
  ): Promise<void> {
    if (member.role !== 'owner' || member.status !== 'active') {
      return;
    }
    const ownerCount = await this.members.count({
      where: { orgId: member.orgId, role: 'owner', status: 'active' },
    });
    if (ownerCount <= 1) {
      throw new BadRequestException(`Cannot ${input.action}.`);
    }
  }

  private async createUniqueOrganizationSlug(input: string): Promise<string> {
    const base = slugify(input);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
      const slug = `${base}${suffix}`.slice(0, 64);
      const existing = await this.organizations.findOne({ where: { slug } });
      if (!existing) {
        return slug;
      }
    }
    throw new ConflictException('Could not create a unique organization slug.');
  }

  private toSession(
    account: AccountEntity,
    organization: OrganizationEntity,
    member: OrganizationMemberEntity,
  ) {
    const token = this.auth.issueSessionToken({
      accountId: account.id,
      email: account.email,
      memberId: member.id,
      orgId: organization.id,
      plan: organization.plan,
      role: member.role,
    });
    return {
      token,
      type: 'Bearer',
      ...this.toAccountContext({ account, organization, member }),
    };
  }

  private toAccountContext(context: ActiveMemberContext) {
    return {
      account: this.toPublicAccount(context.account),
      organization: this.toPublicOrganization(context.organization),
      member: {
        id: context.member.id,
        role: context.member.role,
        status: context.member.status,
        createdAt: context.member.createdAt,
        updatedAt: context.member.updatedAt,
      },
    };
  }

  private toPublicMember(member: OrganizationMemberEntity): PublicMember {
    return {
      id: member.id,
      role: member.role,
      status: member.status,
      account: this.toPublicAccount(member.account),
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }

  private toPublicAccount(account: AccountEntity): PublicAccount {
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      status: account.status,
      lastLoginAt: account.lastLoginAt ?? null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private toPublicOrganization(organization: OrganizationEntity) {
    return {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      plan: organization.plan,
      subscriptionStatus: organization.subscriptionStatus ?? null,
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || `workspace-${randomBytes(4).toString('hex')}`;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, encoded] = stored.split(':');
  if (algorithm !== 'scrypt' || !salt || !encoded) {
    return false;
  }
  const hash = Buffer.from(encoded, 'hex');
  const candidate = (await scrypt(password, salt, hash.length)) as Buffer;
  return hash.length === candidate.length && timingSafeEqual(hash, candidate);
}

function anonymizeEmail(account: AccountEntity): string {
  return `deleted-${account.id}@deleted.remote-devtools.local`;
}
