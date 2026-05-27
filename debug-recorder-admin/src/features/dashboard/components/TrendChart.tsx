import { Card, Empty } from 'antd'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TicketTrendData, RecordRoomTrendData, ViewMode } from '../types'

interface TrendChartProps {
  viewMode: ViewMode
  ticketData: TicketTrendData[]
  recordRoomData: RecordRoomTrendData[]
  isLoading: boolean
}

const COLORS = {
  created: '#1890ff',
  resolved: '#52c41a',
  pending: '#faad14',
  messages: '#722ed1',
  participants: '#eb2f96',
}

export function TrendChart({
  viewMode,
  ticketData,
  recordRoomData,
  isLoading,
}: TrendChartProps) {
  const title = viewMode === 'ticket' ? '티켓 추이' : '녹화방 추이'
  const isTicketView = viewMode === 'ticket'
  const data = isTicketView ? ticketData : recordRoomData

  if (!data.length && !isLoading) {
    return (
      <Card title={title}>
        <Empty description="데이터가 없습니다" />
      </Card>
    )
  }

  return (
    <Card title={title} loading={isLoading}>
      <ResponsiveContainer width="100%" height={400}>
        {isTicketView ? (
          <LineChart
            data={ticketData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              stroke={COLORS.created}
              name="생성"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="resolved"
              stroke={COLORS.resolved}
              name="해결"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="pending"
              stroke={COLORS.pending}
              name="대기"
              strokeWidth={2}
            />
          </LineChart>
        ) : (
          <LineChart
            data={recordRoomData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              stroke={COLORS.created}
              name="생성"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="messages"
              stroke={COLORS.messages}
              name="메시지"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="participants"
              stroke={COLORS.participants}
              name="참여자"
              strokeWidth={2}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </Card>
  )
}
