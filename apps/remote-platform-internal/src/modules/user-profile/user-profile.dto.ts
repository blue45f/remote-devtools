import { JobType, AssigneeInfo, DeviceInfo } from "@remote-platform/entity";

export interface CreateUserProfileDto {
  name: string; // 한글 이름 (홍영준)
  username?: string; // 영어 ID (dd) - JIRA reporter/assignee용
  jobType: JobType;
  slackId: string;
  empNo: string; // 8자리 사번 (예: '22010083')
  deviceInfoList: DeviceInfo[]; // 디바이스 정보 객체 배열 (name + deviceId)

  // 티켓 템플릿 정보
  ticketTemplateList: {
    name: string;
    tcSheetLink?: string;
    jiraProjectKey?: string;
    epicTicket?: string;
    titlePrefix?: string;
    assigneeInfoList?: AssigneeInfo[];
    componentList?: string[];
    labelList?: string[];
  }[];
}

export interface UpdateUserProfileDto {
  name: string; // 한글 이름 (홍영준)
  username: string; // 영어 ID (dd) - JIRA reporter/assignee용
  jobType: JobType;
  empNo: string; // 8자리 사번
  email: string;
  deviceInfoList: DeviceInfo[]; // 디바이스 정보 객체 배열 (name + deviceId)

  // 티켓 템플릿 정보 (배열 - 빈 배열 허용, 있으면 내부 필드 필수)
  ticketTemplateList?: {
    id?: number; // 수정할 템플릿의 ID (없으면 새로 생성)
    name: string;
    tcSheetLink?: string;
    jiraProjectKey: string;
    epicTicket?: string;
    titlePrefix?: string;
    assigneeInfoList?: AssigneeInfo[];
    componentList?: string[];
    labelList?: string[];
  }[];

  // 마지막 선택 템플릿 이름 (어드민에서 선택한 템플릿)
  lastSelectedTemplateName?: string;
}

export interface UserProfileResponseDto {
  id: number;
  name: string; // 한글 이름 (홍영준)
  username?: string; // 영어 ID (dd) - JIRA reporter/assignee용
  jobType: JobType;
  slackId: string;
  empNo: string; // 8자리 사번
  deviceInfoList: DeviceInfo[]; // 디바이스 정보 객체 배열 (name + deviceId)
  createdAt: Date;
  updatedAt: Date;

  // 티켓 템플릿 정보 (배열)
  ticketTemplateList: {
    id: number;
    name: string;
    tcSheetLink?: string;
    jiraProjectKey?: string;
    epicTicket?: string;
    titlePrefix?: string;
    assigneeInfoList?: AssigneeInfo[];
    componentList?: string[];
    labelList?: string[];
    createdAt: Date;
    updatedAt: Date;
  }[];

  // 마지막으로 선택/수정된 템플릿 (어드민 자동 선택용)
  lastSelectedTemplate?: {
    id: number;
    name: string;
    tcSheetLink?: string;
    jiraProjectKey?: string;
    epicTicket?: string;
    titlePrefix?: string;
    assigneeInfoList?: AssigneeInfo[];
    componentList?: string[];
    labelList?: string[];
    createdAt: Date;
    updatedAt: Date;
  };
}
