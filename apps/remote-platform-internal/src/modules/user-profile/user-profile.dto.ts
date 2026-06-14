import { JobType } from '@remote-platform/entity';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import type { AssigneeInfo, DeviceInfo } from '@remote-platform/entity';

// The element shapes below mirror the `DeviceInfo` / `AssigneeInfo` entity
// interfaces. They are `.loose()` so unknown keys survive, matching the old
// behaviour where these lists were only checked with `@IsArray` (no nested
// whitelist), while still inferring the correct element types.
const deviceInfoSchema = z.object({
  name: z.string().optional(),
  deviceId: z.string(),
});

const assigneeInfoSchema = z.object({
  displayName: z.string(),
  username: z.string().optional(),
  email: z.string().optional(),
});

// Nested ticket template. The old DTO validated this via `@ValidateNested`, so
// `forbidNonWhitelisted` applied here too — hence `.strict()`.
export const ticketTemplateSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().min(1).max(100),
    tcSheetLink: z.url().max(500).optional(),
    jiraProjectKey: z.string().max(50).optional(),
    epicTicket: z.string().max(50).optional(),
    titlePrefix: z.string().max(100).optional(),
    assigneeInfoList: z.array(assigneeInfoSchema).optional(),
    componentList: z.array(z.string()).optional(),
    labelList: z.array(z.string()).optional(),
  })
  .strict();

export const createUserProfileSchema = z
  .object({
    name: z.string().min(1).max(100),
    username: z.string().max(100).optional(),
    jobType: z.enum(JobType),
    slackId: z.string().min(1).max(50),
    empNo: z.string().regex(/^\d{8}$/, { message: 'empNo must be an 8-digit number' }),
    deviceInfoList: z.array(deviceInfoSchema),
    ticketTemplateList: z.array(ticketTemplateSchema),
  })
  .strict();

export class CreateUserProfileDto extends createZodDto(createUserProfileSchema) {}

export const updateUserProfileSchema = z
  .object({
    name: z.string().min(1).max(100),
    username: z.string().min(1).max(100),
    jobType: z.enum(JobType),
    empNo: z.string().regex(/^\d{8}$/, { message: 'empNo must be an 8-digit number' }),
    email: z.string().min(1).max(254),
    deviceInfoList: z.array(deviceInfoSchema).optional(),
    ticketTemplateList: z.array(ticketTemplateSchema).optional(),
    lastSelectedTemplateName: z.string().max(100).optional(),
  })
  .strict();

export class UpdateUserProfileDto extends createZodDto(updateUserProfileSchema) {}

export interface UserProfileResponseDto {
  readonly id: number;
  readonly name: string;
  readonly username?: string;
  readonly jobType: JobType;
  readonly slackId: string;
  readonly empNo: string;
  readonly deviceInfoList: DeviceInfo[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly ticketTemplateList: {
    readonly id: number;
    readonly name: string;
    readonly tcSheetLink?: string;
    readonly jiraProjectKey?: string;
    readonly epicTicket?: string;
    readonly titlePrefix?: string;
    readonly assigneeInfoList?: AssigneeInfo[];
    readonly componentList?: string[];
    readonly labelList?: string[];
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }[];
  readonly lastSelectedTemplate?: {
    readonly id: number;
    readonly name: string;
    readonly tcSheetLink?: string;
    readonly jiraProjectKey?: string;
    readonly epicTicket?: string;
    readonly titlePrefix?: string;
    readonly assigneeInfoList?: AssigneeInfo[];
    readonly componentList?: string[];
    readonly labelList?: string[];
    readonly createdAt: Date;
    readonly updatedAt: Date;
  };
}
