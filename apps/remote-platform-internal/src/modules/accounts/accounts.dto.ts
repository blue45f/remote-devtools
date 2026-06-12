import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import type {
  AccountStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
} from '@remote-platform/entity';

export class RegisterAccountDto {
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  public email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  public password: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public organizationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  public organizationSlug?: string;
}

export class LoginAccountDto {
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  public email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public password: string;
}

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  public password?: string;
}

export class InviteOrganizationMemberDto {
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  public email: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public name?: string;

  @IsOptional()
  @IsIn(['owner', 'admin', 'member', 'viewer'])
  public role?: OrganizationMemberRole;

  @IsOptional()
  @IsIn(['active', 'invited', 'suspended'])
  public status?: Exclude<OrganizationMemberStatus, 'deleted'>;
}

export class UpdateOrganizationMemberDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public name?: string;

  @IsOptional()
  @IsIn(['owner', 'admin', 'member', 'viewer'])
  public role?: OrganizationMemberRole;

  @IsOptional()
  @IsIn(['active', 'invited', 'suspended', 'deleted'])
  public status?: OrganizationMemberStatus;
}

export class AdminUpdateAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  public name?: string;

  @IsOptional()
  @IsIn(['active', 'suspended', 'deleted'])
  public status?: AccountStatus;
}
