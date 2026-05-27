export type PeriodType = 'day' | 'week' | 'month'

export type ViewMode = 'ticket' | 'recordRoom'

export interface DashboardStats {
  totalTickets: number
  todayTickets: number
  weeklyAverage: number
  resolveRate?: number
  totalRecordRooms: number
  todayRecordRooms: number
  weeklyAverageRecordRooms: number
  activeRecordRooms?: number
}

export interface TicketTrendData {
  date: string
  created: number
  resolved: number
  pending: number
  developer?: number
  designer?: number
  pm?: number
  qa?: number
  other?: number
}

export interface RecordRoomTrendData {
  date: string
  created: number
  messages: number
  participants: number
  developer?: number
  designer?: number
  pm?: number
  qa?: number
  other?: number
}

export interface TrendRequestParams {
  period: PeriodType
  startDate?: string
  endDate?: string
}
