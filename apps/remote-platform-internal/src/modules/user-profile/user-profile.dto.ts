import { JobType, AssigneeInfo, DeviceInfo } from "@remote-platform/entity";

export interface CreateUserProfileDto {
  /** Display name (e.g., full name) */
  readonly name: string;
  /** English ID used for JIRA reporter/assignee */
  readonly username?: string;
  readonly jobType: JobType;
  readonly slackId: string;
  /** 8-digit employee number (e.g., '22010083') */
  readonly empNo: string;
  /** Device information list (name + deviceId) */
  readonly deviceInfoList: DeviceInfo[];

  /** Ticket template definitions */
  readonly ticketTemplateList: {
    readonly name: string;
    readonly tcSheetLink?: string;
    readonly jiraProjectKey?: string;
    readonly epicTicket?: string;
    readonly titlePrefix?: string;
    readonly assigneeInfoList?: AssigneeInfo[];
    readonly componentList?: string[];
    readonly labelList?: string[];
  }[];
}

export interface UpdateUserProfileDto {
  /** Display name (e.g., full name) */
  readonly name: string;
  /** English ID used for JIRA reporter/assignee */
  readonly username: string;
  readonly jobType: JobType;
  /** 8-digit employee number */
  readonly empNo: string;
  readonly email: string;
  /** Device information list (name + deviceId) */
  readonly deviceInfoList: DeviceInfo[];

  /** Ticket template definitions (empty array allowed; inner fields required when present) */
  readonly ticketTemplateList?: {
    readonly id?: number;
    readonly name: string;
    readonly tcSheetLink?: string;
    readonly jiraProjectKey: string;
    readonly epicTicket?: string;
    readonly titlePrefix?: string;
    readonly assigneeInfoList?: AssigneeInfo[];
    readonly componentList?: string[];
    readonly labelList?: string[];
  }[];

  /** Name of the last selected template (chosen from admin) */
  readonly lastSelectedTemplateName?: string;
}

export interface UserProfileResponseDto {
  readonly id: number;
  /** Display name (e.g., full name) */
  readonly name: string;
  /** English ID used for JIRA reporter/assignee */
  readonly username?: string;
  readonly jobType: JobType;
  readonly slackId: string;
  /** 8-digit employee number */
  readonly empNo: string;
  /** Device information list (name + deviceId) */
  readonly deviceInfoList: DeviceInfo[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  /** Ticket template list */
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

  /** Last selected/modified template (for admin auto-selection) */
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
