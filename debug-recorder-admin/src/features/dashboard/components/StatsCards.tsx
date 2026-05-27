import { Row, Col, Card, Statistic } from 'antd'
import {
  FileTextOutlined,
  VideoCameraOutlined,
  RiseOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { DashboardStats, ViewMode } from '../types'

interface StatsCardsProps {
  stats: DashboardStats | null
  viewMode: ViewMode
  isLoading: boolean
}

export function StatsCards({ stats, viewMode, isLoading }: StatsCardsProps) {
  if (viewMode === 'ticket') {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="전체 티켓"
              value={stats?.totalTickets || 0}
              prefix={<FileTextOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="오늘 생성된 티켓"
              value={stats?.todayTickets || 0}
              prefix={<RiseOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="주간 평균"
              value={stats?.weeklyAverage || 0}
              suffix="건"
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="해결률"
              value={stats?.resolveRate || 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>
    )
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="전체 녹화방"
            value={stats?.totalRecordRooms || 0}
            prefix={<VideoCameraOutlined />}
            loading={isLoading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="오늘 생성된 녹화방"
            value={stats?.todayRecordRooms || 0}
            prefix={<RiseOutlined />}
            loading={isLoading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="주간 평균"
            value={stats?.weeklyAverageRecordRooms || 0}
            suffix="건"
            loading={isLoading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="활성 녹화방"
            value={stats?.activeRecordRooms || 0}
            prefix={<VideoCameraOutlined />}
            loading={isLoading}
          />
        </Card>
      </Col>
    </Row>
  )
}
