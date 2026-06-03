import Card from 'antd/es/card';
import Col from 'antd/es/col';
import Row from 'antd/es/row';
import Statistic from 'antd/es/statistic';
import CheckCircleOutlined from '@ant-design/icons/es/icons/CheckCircleOutlined';
import FileTextOutlined from '@ant-design/icons/es/icons/FileTextOutlined';
import RiseOutlined from '@ant-design/icons/es/icons/RiseOutlined';
import VideoCameraOutlined from '@ant-design/icons/es/icons/VideoCameraOutlined';
import { useTranslation } from 'react-i18next';
import type { DashboardStats, ViewMode } from '../types';

interface StatsCardsProps {
  stats: DashboardStats | null;
  viewMode: ViewMode;
  isLoading: boolean;
}

export function StatsCards({ stats, viewMode, isLoading }: StatsCardsProps) {
  const { t } = useTranslation();
  if (viewMode === 'ticket') {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.stats.totalTickets')}
              value={stats?.totalTickets || 0}
              prefix={<FileTextOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.stats.todayTickets')}
              value={stats?.todayTickets || 0}
              prefix={<RiseOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.stats.weeklyAverage')}
              value={stats?.weeklyAverage || 0}
              suffix={t('dashboard.stats.countSuffix')}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.stats.resolveRate')}
              value={stats?.resolveRate || 0}
              suffix={t('dashboard.stats.percentSuffix')}
              prefix={<CheckCircleOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={t('dashboard.stats.totalRecordRooms')}
            value={stats?.totalRecordRooms || 0}
            prefix={<VideoCameraOutlined />}
            loading={isLoading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={t('dashboard.stats.todayRecordRooms')}
            value={stats?.todayRecordRooms || 0}
            prefix={<RiseOutlined />}
            loading={isLoading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={t('dashboard.stats.weeklyAverage')}
            value={stats?.weeklyAverageRecordRooms || 0}
            suffix={t('dashboard.stats.countSuffix')}
            loading={isLoading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title={t('dashboard.stats.activeRecordRooms')}
            value={stats?.activeRecordRooms || 0}
            prefix={<VideoCameraOutlined />}
            loading={isLoading}
          />
        </Card>
      </Col>
    </Row>
  );
}
