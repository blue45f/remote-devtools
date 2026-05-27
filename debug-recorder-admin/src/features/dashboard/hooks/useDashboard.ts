import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getDashboardStats,
  getTicketTrend,
  getRecordRoomTrend,
  generateMockStats,
  generateMockTicketTrend,
  generateMockRecordRoomTrend,
} from '../api'
import type { PeriodType, ViewMode } from '../types'

export function useDashboard() {
  const [period, setPeriod] = useState<PeriodType>('day')
  const [viewMode, setViewMode] = useState<ViewMode>('ticket')

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const ticketTrendQuery = useQuery({
    queryKey: ['dashboard', 'ticket-trend', period],
    queryFn: () => getTicketTrend({ period }),
    enabled: viewMode === 'ticket',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const recordRoomTrendQuery = useQuery({
    queryKey: ['dashboard', 'record-room-trend', period],
    queryFn: () => getRecordRoomTrend({ period }),
    enabled: viewMode === 'recordRoom',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const handlePeriodChange = useCallback((newPeriod: PeriodType) => {
    setPeriod(newPeriod)
  }, [])

  const handleViewModeChange = useCallback((newViewMode: ViewMode) => {
    setViewMode(newViewMode)
  }, [])

  const stats = statsQuery.data || (statsQuery.isError ? generateMockStats() : null)
  const ticketTrend =
    ticketTrendQuery.data ||
    (ticketTrendQuery.isError ? generateMockTicketTrend(period) : [])
  const recordRoomTrend =
    recordRoomTrendQuery.data ||
    (recordRoomTrendQuery.isError ? generateMockRecordRoomTrend(period) : [])

  return {
    period,
    viewMode,
    stats,
    ticketTrend,
    recordRoomTrend,
    isLoading:
      statsQuery.isLoading ||
      ticketTrendQuery.isLoading ||
      recordRoomTrendQuery.isLoading,
    isError: statsQuery.isError,
    handlePeriodChange,
    handleViewModeChange,
    refetch: () => {
      statsQuery.refetch()
      if (viewMode === 'ticket') {
        ticketTrendQuery.refetch()
      } else {
        recordRoomTrendQuery.refetch()
      }
    },
  }
}
