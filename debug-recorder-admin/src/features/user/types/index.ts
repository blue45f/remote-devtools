import type { JobType, DeviceInfo, AssigneeInfo } from '@/shared/types'

export interface TicketTemplateInfo {
  id: number
  name: string
  tcSheetLink?: string
  jiraProjectKey?: string
  epicTicket?: string
  titlePrefix?: string
  assigneeInfoList: AssigneeInfo[]
  componentList: string[]
  labelList: string[]
}

export interface UserProfile {
  id: number
  name: string
  username: string
  jobType: JobType
  slackId: string
  empNo: string
  deviceInfoList: DeviceInfo[]
  ticketTemplateList: TicketTemplateInfo[]
  lastSelectedTemplate?: {
    id: number
    name: string
  }
  createdAt: string
  updatedAt: string
}

export interface UserInfoFormData {
  jobType: JobType
  deviceInfoList: DeviceInfo[]
  ticketTemplateList: TicketTemplateInfo[]
}

export interface UpdateUserInfoRequest {
  jobType: JobType
  deviceInfoList?: DeviceInfo[]
  ticketTemplateList?: TicketTemplateInfo[]
}

export { type JobType, type DeviceInfo, type AssigneeInfo }
