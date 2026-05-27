import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Space from 'antd/es/space'
import ReloadOutlined from '@ant-design/icons/es/icons/ReloadOutlined'
import { PageContainer } from '@/shared/components'
import { useDashboard } from '../hooks'
import { StatsCards } from './StatsCards'
import { PeriodSelector } from './PeriodSelector'
import { TrendChart } from './TrendChart'

export function DashboardPage() {
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
  } = useDashboard()

  return (
    <PageContainer
      title="대시보드"
      extra={
        <Button icon={<ReloadOutlined />} onClick={refetch} loading={isLoading}>
          새로고침
        </Button>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {isError && (
          <Alert
            message="데이터 로드 실패"
            description="서버에서 데이터를 불러오는데 실패했습니다. 임시 데이터를 표시합니다."
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
  )
}
