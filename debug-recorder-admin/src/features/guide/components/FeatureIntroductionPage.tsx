import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Row from 'antd/es/row'
import Typography from 'antd/es/typography'
import ApiOutlined from '@ant-design/icons/es/icons/ApiOutlined'
import AppstoreOutlined from '@ant-design/icons/es/icons/AppstoreOutlined'
import FileTextOutlined from '@ant-design/icons/es/icons/FileTextOutlined'
import MessageOutlined from '@ant-design/icons/es/icons/MessageOutlined'
import NodeIndexOutlined from '@ant-design/icons/es/icons/NodeIndexOutlined'
import VideoCameraOutlined from '@ant-design/icons/es/icons/VideoCameraOutlined'
import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/shared/components'
import { ROUTES, UX_TERMS } from '@/shared/constants'
import designHandoffImage from '@/assets/feature-illustrations/design-handoff.jpg'
import networkRewriteImage from '@/assets/feature-illustrations/network-rewrite.jpg'
import remoteDevtoolsImage from '@/assets/feature-illustrations/remote-devtools.jpg'
import sessionRecordingImage from '@/assets/feature-illustrations/session-recording.jpg'
import teamSharingImage from '@/assets/feature-illustrations/team-sharing.jpg'
import ticketAutomationImage from '@/assets/feature-illustrations/ticket-automation.jpg'

const { Text, Paragraph } = Typography

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  imageSrc: string
  onClick?: () => void
}

function FeatureCard({
  icon,
  title,
  description,
  imageSrc,
  onClick,
}: FeatureCardProps) {
  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ height: '100%' }}
      cover={
        <div
          style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b1220',
            overflow: 'hidden',
          }}
        >
          <img
            src={imageSrc}
            alt={`${title} 기능 미리보기`}
            loading="lazy"
            decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      }
    >
      <Card.Meta
        avatar={
          <div
            style={{
              fontSize: 24,
              color: '#1890ff',
              marginRight: 8,
            }}
          >
            {icon}
          </div>
        }
        title={title}
        description={
          <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
            {description}
          </Paragraph>
        }
      />
    </Card>
  )
}

interface FeatureDefinition {
  icon: ReactNode
  title: string
  description: string
  imageSrc: string
  tab: FeatureGuideTab
}

type UserGuideTab = 'recording' | 'ticket' | 'network-rewrite' | 'design' | 'share'
type FeatureGuideTab = UserGuideTab | 'remote-devtools'

export function FeatureIntroductionPage() {
  const navigate = useNavigate()
  const issueTrackerName = UX_TERMS.ISSUE_TRACKER_NAME
  const issueLabel = UX_TERMS.ISSUE_LABEL

  const features = [
    {
      icon: <VideoCameraOutlined />,
      title: '녹화방',
      description:
        '화면 녹화와 함께 네트워크 요청, 콘솔 로그를 자동으로 캡처하여 디버깅에 필요한 정보를 수집합니다.',
      imageSrc: sessionRecordingImage,
      tab: 'recording',
    },
    {
      icon: <FileTextOutlined />,
      title: `${issueLabel} 생성`,
      description:
        `녹화된 정보를 바탕으로 ${issueTrackerName}을(를) 자동 생성합니다. 템플릿을 활용하여 일관된 형식의 ${issueLabel}을(를) 작성할 수 있습니다.`,
      imageSrc: ticketAutomationImage,
      tab: 'ticket',
    },
    {
      icon: <ApiOutlined />,
      title: 'Network Rewrite',
      description:
        'API 응답을 수정하여 다양한 상황을 테스트할 수 있습니다. 에러 상황이나 엣지 케이스를 쉽게 재현할 수 있습니다.',
      imageSrc: networkRewriteImage,
      tab: 'network-rewrite',
    },
    {
      icon: <AppstoreOutlined />,
      title: `${UX_TERMS.DESIGN_TOOL_NAME} 연동`,
      description:
        `${UX_TERMS.DESIGN_TOOL_NAME}와 연계해 녹화 흐름을 공유하고 피드백을 정리할 수 있습니다.`,
      imageSrc: designHandoffImage,
      tab: 'design',
    },
    {
      icon: <MessageOutlined />,
      title: UX_TERMS.SHARE_CHANNEL_NAME,
      description: `${UX_TERMS.SHARE_CHANNEL_NAME}로 알림/공유 메시지를 자동 전송할 수 있습니다.`,
      imageSrc: teamSharingImage,
      tab: 'share',
    },
    {
      icon: <NodeIndexOutlined />,
      title: 'Remote DevTools',
      description:
        '실시간으로 원격 디버그 세션을 수집/관찰하고, 이벤트 스트림·세션 상태·명령 제어까지 한 화면에서 관리합니다.',
      imageSrc: remoteDevtoolsImage,
      tab: 'remote-devtools',
    },
  ] satisfies Array<FeatureDefinition>

  return (
    <PageContainer title="기능 소개">
      <Row gutter={[24, 24]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <FeatureCard
              {...feature}
              onClick={() =>
                feature.tab === 'remote-devtools'
                  ? navigate(ROUTES.REMOTE_DEVTOOLS)
                  : navigate({
                      pathname: ROUTES.USER_GUIDE,
                      search: `?tab=${feature.tab}`,
                    })
              }
            />
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {UX_TERMS.APP_NAME}를 시작하려면 유저 정보를 먼저 설정해주세요.
        </Text>
        <Button type="primary" size="large" onClick={() => navigate(ROUTES.USER_INFO)}>
          유저 정보 설정하기
        </Button>
      </div>
    </PageContainer>
  )
}
