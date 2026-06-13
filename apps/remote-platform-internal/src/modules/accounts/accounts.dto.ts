import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Trim + lowercase, then validate as an email (matches the old
// `@Transform(trim().toLowerCase())` + `@IsEmail()` + `@MaxLength(320)`).
const normalizedEmail = z.string().trim().toLowerCase().pipe(z.email().max(320));

// Trimmed, non-empty display name capped at 120 chars.
const trimmedName = z.string().trim().min(1).max(120);

const organizationSlug = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .max(64)
      .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  );

const organizationMemberRole = z.enum(['owner', 'admin', 'member', 'viewer']);

export const registerAccountSchema = z
  .object({
    email: normalizedEmail,
    name: trimmedName,
    password: z.string().min(8).max(128),
    organizationName: z.string().trim().max(200).optional(),
    organizationSlug: organizationSlug.optional(),
  })
  .strict();

export class RegisterAccountDto extends createZodDto(registerAccountSchema) {}

export const loginAccountSchema = z
  .object({
    email: normalizedEmail,
    password: z.string().min(1).max(128),
  })
  .strict();

export class LoginAccountDto extends createZodDto(loginAccountSchema) {}

export const updateMeSchema = z
  .object({
    name: trimmedName.optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .strict();

export class UpdateMeDto extends createZodDto(updateMeSchema) {}

export const inviteOrganizationMemberSchema = z
  .object({
    email: normalizedEmail,
    name: trimmedName.optional(),
    role: organizationMemberRole.optional(),
    status: z.enum(['active', 'invited', 'suspended']).optional(),
  })
  .strict();

export class InviteOrganizationMemberDto extends createZodDto(inviteOrganizationMemberSchema) {}

export const updateOrganizationMemberSchema = z
  .object({
    name: trimmedName.optional(),
    role: organizationMemberRole.optional(),
    status: z.enum(['active', 'invited', 'suspended', 'deleted']).optional(),
  })
  .strict();

export class UpdateOrganizationMemberDto extends createZodDto(updateOrganizationMemberSchema) {}

export const adminUpdateAccountSchema = z
  .object({
    name: trimmedName.optional(),
    status: z.enum(['active', 'suspended', 'deleted']).optional(),
  })
  .strict();

export class AdminUpdateAccountDto extends createZodDto(adminUpdateAccountSchema) {}
