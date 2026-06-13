import { JobType, AssigneeInfo, DeviceInfo } from '@remote-platform/entity';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
  IsNumber,
} from 'class-validator';

class TicketTemplateDto {
  @IsOptional()
  @IsNumber()
  readonly id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(500)
  readonly tcSheetLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly jiraProjectKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly epicTicket?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @MaxLength(100)
  readonly name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly username?: string;

  @IsEnum(JobType)
  readonly jobType: JobType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly slackId: string;

  @IsString()
  @Matches(/^\d{8}$/, { message: 'empNo must be an 8-digit number' })
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
  @MaxLength(100)
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly username: string;

  @IsEnum(JobType)
  readonly jobType: JobType;

  @IsString()
  @Matches(/^\d{8}$/, { message: 'empNo must be an 8-digit number' })
  readonly empNo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
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
  @MaxLength(100)
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
