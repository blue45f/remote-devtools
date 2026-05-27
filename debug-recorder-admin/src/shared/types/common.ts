export type JobType = 'QA' | 'PM' | 'PD' | 'DEV' | 'OTHER'

export interface DeviceInfo {
  name?: string
  deviceId: string
}

export interface AssigneeInfo {
  accountId: string
  displayName: string
}

export interface SelectOption<T = string> {
  label: string
  value: T
}
