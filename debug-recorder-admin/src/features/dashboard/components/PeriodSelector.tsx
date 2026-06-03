import Radio from 'antd/es/radio';
import type { RadioChangeEvent } from 'antd/es/radio';
import Space from 'antd/es/space';
import { useTranslation } from 'react-i18next';
import type { PeriodType, ViewMode } from '../types';

interface PeriodSelectorProps {
  period: PeriodType;
  viewMode: ViewMode;
  onPeriodChange: (period: PeriodType) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
}

export function PeriodSelector({
  period,
  viewMode,
  onPeriodChange,
  onViewModeChange,
}: PeriodSelectorProps) {
  const { t } = useTranslation();
  const handlePeriodChange = (e: RadioChangeEvent) => {
    onPeriodChange(e.target.value as PeriodType);
  };

  const handleViewModeChange = (e: RadioChangeEvent) => {
    onViewModeChange(e.target.value as ViewMode);
  };

  return (
    <Space size="large" wrap>
      <Radio.Group value={viewMode} onChange={handleViewModeChange}>
        <Radio.Button value="ticket">{t('dashboard.viewMode.ticket')}</Radio.Button>
        <Radio.Button value="recordRoom">{t('dashboard.viewMode.recordRoom')}</Radio.Button>
      </Radio.Group>

      <Radio.Group value={period} onChange={handlePeriodChange}>
        <Radio.Button value="day">{t('dashboard.period.day')}</Radio.Button>
        <Radio.Button value="week">{t('dashboard.period.week')}</Radio.Button>
        <Radio.Button value="month">{t('dashboard.period.month')}</Radio.Button>
      </Radio.Group>
    </Space>
  );
}
