export type JobType = 'QA' | 'PM' | 'PD' | 'DEV' | 'OTHER';

export const JOB_TYPES: JobType[] = ['QA', 'PM', 'PD', 'DEV', 'OTHER'];

export interface DeviceInfo {
  deviceId: string;
  name?: string;
}

export interface AssigneeInfo {
  accountId: string;
  displayName: string;
}

export interface TicketTemplate {
  id?: number;
  name: string;
  tcSheetLink?: string;
  jiraProjectKey?: string;
  epicTicket?: string;
  titlePrefix?: string;
  componentList?: string[];
  labelList?: string[];
  assigneeInfoList?: AssigneeInfo[];
}

export interface UserProfile {
  id?: number;
  name: string;
  username?: string;
  jobType: JobType;
  slackId?: string;
  empNo: string;
  deviceInfoList: DeviceInfo[];
  ticketTemplateList: TicketTemplate[];
  lastSelectedTemplate?: { id: number; name: string };
  createdAt?: string;
  updatedAt?: string;
}

/** PUT payload — only the fields the profile screen edits. */
export interface UpdateProfilePayload {
  name?: string;
  jobType: JobType;
  slackId?: string;
  deviceInfoList: DeviceInfo[];
  ticketTemplateList: TicketTemplate[];
}
