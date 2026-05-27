import { apiClient } from '@/shared/api'
import type {
  DashboardStats,
  TicketTrendData,
  RecordRoomTrendData,
  TrendRequestParams,
} from '../types'

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient.get<DashboardStats>('/api/dashboard/stats')
}

export async function getTicketTrend(
  params: TrendRequestParams
): Promise<TicketTrendData[]> {
  return apiClient.get<TicketTrendData[]>('/api/dashboard/ticket-trend', {
    params,
  })
}

export async function getRecordRoomTrend(
  params: TrendRequestParams
): Promise<RecordRoomTrendData[]> {
  return apiClient.get<RecordRoomTrendData[]>(
    '/api/dashboard/record-room-trend',
    { params }
  )
}
