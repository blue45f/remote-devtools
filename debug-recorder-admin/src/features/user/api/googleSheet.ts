import { apiClient } from '@/shared/api'
import { CONFIG } from '@/shared/constants'
import type { AssigneeInfo } from '../types'

export interface TcSheetData {
  jiraProjectKey: string
  epicTicket?: string
  assigneeInfoList: AssigneeInfo[]
  componentList: string[]
  labelList: string[]
}

export async function getTcSheetData(
  sheetUrl: string,
  sheetName?: string
): Promise<TcSheetData> {
  return apiClient.get<TcSheetData>('/api/google-sheet/tc', {
    params: {
      url: sheetUrl,
      sheetName: sheetName || CONFIG.DEFAULT_SHEET_NAME,
    },
  })
}
