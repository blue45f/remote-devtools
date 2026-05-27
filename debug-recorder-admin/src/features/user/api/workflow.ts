import { apiClient } from '@/shared/api'
import type { AssigneeInfo } from '../types'

export interface WorkflowMember {
  accountId: string
  displayName: string
  emailAddress?: string
  avatarUrl?: string
}

export async function getWorkflowMembers(): Promise<WorkflowMember[]> {
  return apiClient.get<WorkflowMember[]>('/api/workflow/members')
}

export function toAssigneeInfo(member: WorkflowMember): AssigneeInfo {
  return {
    accountId: member.accountId,
    displayName: member.displayName,
  }
}
