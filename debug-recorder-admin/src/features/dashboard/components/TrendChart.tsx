import Card from 'antd/es/card';
import Empty from 'antd/es/empty';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TicketTrendData, RecordRoomTrendData, ViewMode } from '../types';

interface TrendChartProps {
  viewMode: ViewMode;
  ticketData: TicketTrendData[];
  recordRoomData: RecordRoomTrendData[];
  isLoading: boolean;
}

const COLORS = {
  created: '#1890ff',
  resolved: '#52c41a',
  pending: '#faad14',
  messages: '#722ed1',
  participants: '#eb2f96',
};

export function TrendChart({ viewMode, ticketData, recordRoomData, isLoading }: TrendChartProps) {
  const { t } = useTranslation();
  const isTicketView = viewMode === 'ticket';
  const title = isTicketView
    ? t('dashboard.trend.ticketTitle')
    : t('dashboard.trend.recordRoomTitle');
  const data = isTicketView ? ticketData : recordRoomData;

  if (!data.length && !isLoading) {
    return (
      <Card title={title}>
        <Empty description={t('dashboard.trend.empty')} />
      </Card>
    );
  }

  return (
    <Card title={title} loading={isLoading}>
      <ResponsiveContainer width="100%" height={400}>
        {isTicketView ? (
          <LineChart data={ticketData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              stroke={COLORS.created}
              name={t('dashboard.trend.series.created')}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="resolved"
              stroke={COLORS.resolved}
              name={t('dashboard.trend.series.resolved')}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="pending"
              stroke={COLORS.pending}
              name={t('dashboard.trend.series.pending')}
              strokeWidth={2}
            />
          </LineChart>
        ) : (
          <LineChart data={recordRoomData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              stroke={COLORS.created}
              name={t('dashboard.trend.series.created')}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="messages"
              stroke={COLORS.messages}
              name={t('dashboard.trend.series.messages')}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="participants"
              stroke={COLORS.participants}
              name={t('dashboard.trend.series.participants')}
              strokeWidth={2}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}
