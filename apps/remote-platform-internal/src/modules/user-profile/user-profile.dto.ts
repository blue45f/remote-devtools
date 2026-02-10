import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  Matches,
  ValidateNested,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";
import { JobType, AssigneeInfo, DeviceInfo } from "@remote-platform/entity";

class TicketTemplateDto {
  @IsOptional()
  @IsNumber()
  readonly id?: number;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly tcSheetLink?: string;

  @IsOptional()
  @IsString()
  readonly jiraProjectKey?: string;

  @IsOptional()
  @IsString()
  readonly epicTicket?: string;

  @IsOptional()
  @IsString()
  readonly titlePrefix?: string;

  @IsOptional()
  @IsArray()
  readonly assigneeInfoList?: AssigneeInfo[];

  @IsOptional()
  @IsArray()
  readonly componentList?: string[];

  @IsOptional()
  @IsArray()
  readonly labelList?: string[];
}

export class CreateUserProfileDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly username?: string;

  @IsEnum(JobType)
  readonly jobType: JobType;

  @IsString()
  @IsNotEmpty()
  readonly slackId: string;

  @IsString()
  @Matches(/^\d{8}$/, { message: "empNo must be an 8-digit number" })
  readonly empNo: string;

  @IsArray()
  readonly deviceInfoList: DeviceInfo[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTemplateDto)
  readonly ticketTemplateList: TicketTemplateDto[];
}

export class UpdateUserProfileDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly username: string;

  @IsEnum(JobType)
  readonly jobType: JobType;

  @IsString()
  @Matches(/^\d{8}$/, { message: "empNo must be an 8-digit number" })
  readonly empNo: string;

  @IsString()
  @IsNotEmpty()
  readonly email: string;

  @IsOptional()
  @IsArray()
  readonly deviceInfoList?: DeviceInfo[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTemplateDto)
  readonly ticketTemplateList?: TicketTemplateDto[];

  @IsOptional()
  @IsString()
  readonly lastSelectedTemplateName?: string;
}

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
