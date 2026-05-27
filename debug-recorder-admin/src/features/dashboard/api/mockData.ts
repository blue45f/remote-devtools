import {
  formatDate,
  formatShortDate,
  getDateRange,
  getWeekRange,
  getMonthRange,
} from '@/shared/utils'
import type {
  DashboardStats,
  TicketTrendData,
  RecordRoomTrendData,
  PeriodType,
} from '../types'

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateMockStats(): DashboardStats {
  return {
    totalTickets: randomInt(500, 2000),
    todayTickets: randomInt(5, 30),
    weeklyAverage: randomInt(50, 150),
    resolveRate: randomInt(70, 95),
    totalRecordRooms: randomInt(200, 800),
    todayRecordRooms: randomInt(3, 20),
    weeklyAverageRecordRooms: randomInt(30, 80),
    activeRecordRooms: randomInt(10, 50),
  }
}

export function generateMockTicketTrend(period: PeriodType): TicketTrendData[] {
  const dates = getDatesForPeriod(period)

  return dates.map((date) => ({
    date: formatDateForPeriod(date, period),
    created: randomInt(5, 30),
    resolved: randomInt(3, 25),
    pending: randomInt(2, 15),
    developer: randomInt(2, 10),
    designer: randomInt(1, 8),
    pm: randomInt(1, 5),
    qa: randomInt(2, 12),
    other: randomInt(0, 5),
  }))
}

export function generateMockRecordRoomTrend(
  period: PeriodType
): RecordRoomTrendData[] {
  const dates = getDatesForPeriod(period)

  return dates.map((date) => ({
    date: formatDateForPeriod(date, period),
    created: randomInt(3, 20),
    messages: randomInt(50, 300),
    participants: randomInt(5, 30),
    developer: randomInt(2, 8),
    designer: randomInt(1, 6),
    pm: randomInt(1, 4),
    qa: randomInt(2, 10),
    other: randomInt(0, 3),
  }))
}

function getDatesForPeriod(period: PeriodType): Date[] {
  switch (period) {
    case 'day':
      return getDateRange(14)
    case 'week':
      return getWeekRange(8)
    case 'month':
      return getMonthRange(6)
    default:
      return getDateRange(14)
  }
}

function formatDateForPeriod(date: Date, period: PeriodType): string {
  switch (period) {
    case 'day':
      return formatShortDate(date)
    case 'week':
      return `W${getWeekNumber(date)}`
    case 'month':
      return `${date.getMonth() + 1}월`
    default:
      return formatDate(date)
  }
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  )
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}
