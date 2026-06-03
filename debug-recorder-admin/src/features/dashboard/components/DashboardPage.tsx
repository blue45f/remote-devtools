import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import { useTranslation } from 'react-i18next';
import ReloadOutlined from '@ant-design/icons/es/icons/ReloadOutlined';
import { PageContainer } from '@/shared/components';
import { useDashboard } from '../hooks';
import { StatsCards } from './StatsCards';
import { PeriodSelector } from './PeriodSelector';
import { TrendChart } from './TrendChart';

export function DashboardPage() {
  const { t } = useTranslation();
  const {
    period,
    viewMode,
    stats,
    ticketTrend,
    recordRoomTrend,
    isLoading,
    isError,
    handlePeriodChange,
    handleViewModeChange,
    refetch,
  } = useDashboard();

  return (
    <PageContainer
      title={t('dashboard.title')}
      extra={
        <Button icon={<ReloadOutlined />} onClick={refetch} loading={isLoading}>
          {t('dashboard.refresh')}
        </Button>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {isError && (
          <Alert
            message={t('dashboard.loadErrorTitle')}
            description={t('dashboard.loadErrorDescription')}
            type="warning"
            showIcon
            closable
          />
        )}

        <PeriodSelector
          period={period}
          viewMode={viewMode}
          onPeriodChange={handlePeriodChange}
          onViewModeChange={handleViewModeChange}
        />

        <StatsCards stats={stats} viewMode={viewMode} isLoading={isLoading} />

        <TrendChart
          viewMode={viewMode}
          ticketData={ticketTrend}
          recordRoomData={recordRoomTrend}
          isLoading={isLoading}
        />
      </Space>
    </PageContainer>
  );
}
