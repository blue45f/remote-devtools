import { Radio, Space } from 'antd'
import type { RadioChangeEvent } from 'antd'
import type { PeriodType, ViewMode } from '../types'

interface PeriodSelectorProps {
  period: PeriodType
  viewMode: ViewMode
  onPeriodChange: (period: PeriodType) => void
  onViewModeChange: (viewMode: ViewMode) => void
}

export function PeriodSelector({
  period,
  viewMode,
  onPeriodChange,
  onViewModeChange,
}: PeriodSelectorProps) {
  const handlePeriodChange = (e: RadioChangeEvent) => {
    onPeriodChange(e.target.value as PeriodType)
  }

  const handleViewModeChange = (e: RadioChangeEvent) => {
    onViewModeChange(e.target.value as ViewMode)
  }

  return (
    <Space size="large" wrap>
      <Radio.Group value={viewMode} onChange={handleViewModeChange}>
        <Radio.Button value="ticket">티켓</Radio.Button>
        <Radio.Button value="recordRoom">녹화방</Radio.Button>
      </Radio.Group>

      <Radio.Group value={period} onChange={handlePeriodChange}>
        <Radio.Button value="day">일별</Radio.Button>
        <Radio.Button value="week">주별</Radio.Button>
        <Radio.Button value="month">월별</Radio.Button>
      </Radio.Group>
    </Space>
  )
}
