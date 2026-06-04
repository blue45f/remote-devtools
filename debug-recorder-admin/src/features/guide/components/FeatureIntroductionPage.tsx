import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Col from 'antd/es/col';
import Row from 'antd/es/row';
import Typography from 'antd/es/typography';
import ApiOutlined from '@ant-design/icons/es/icons/ApiOutlined';
import AppstoreOutlined from '@ant-design/icons/es/icons/AppstoreOutlined';
import FileTextOutlined from '@ant-design/icons/es/icons/FileTextOutlined';
import MessageOutlined from '@ant-design/icons/es/icons/MessageOutlined';
import NodeIndexOutlined from '@ant-design/icons/es/icons/NodeIndexOutlined';
import VideoCameraOutlined from '@ant-design/icons/es/icons/VideoCameraOutlined';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/shared/components';
import { ROUTES, UX_TERMS } from '@/shared/constants';
import designHandoffImage from '@/assets/feature-illustrations/design-handoff.svg';
import networkRewriteImage from '@/assets/feature-illustrations/network-rewrite.svg';
import remoteDevtoolsImage from '@/assets/feature-illustrations/remote-devtools.svg';
import sessionRecordingImage from '@/assets/feature-illustrations/session-recording.svg';
import teamSharingImage from '@/assets/feature-illustrations/team-sharing.svg';
import ticketAutomationImage from '@/assets/feature-illustrations/ticket-automation.svg';

const { Text, Paragraph } = Typography;

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  imageSrc: string;
  onClick?: () => void;
}

function FeatureCard({ icon, title, description, imageSrc, onClick }: FeatureCardProps) {
  const { t } = useTranslation();

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
            alt={t('featureIntro.previewAlt', { title })}
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
  );
}

interface FeatureDefinition {
  icon: ReactNode;
  title: string;
  description: string;
  imageSrc: string;
  tab: FeatureGuideTab;
}

type UserGuideTab = 'recording' | 'ticket' | 'network-rewrite' | 'design' | 'share';
type FeatureGuideTab = UserGuideTab | 'remote-devtools';

export function FeatureIntroductionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const issueTrackerName = UX_TERMS.ISSUE_TRACKER_NAME;
  const issueLabel = UX_TERMS.ISSUE_LABEL;
  const designTool = UX_TERMS.DESIGN_TOOL_NAME;
  const shareChannel = UX_TERMS.SHARE_CHANNEL_NAME;

  const features = [
    {
      icon: <VideoCameraOutlined />,
      title: t('featureIntro.recordingTitle'),
      description: t('featureIntro.recordingDescription'),
      imageSrc: sessionRecordingImage,
      tab: 'recording',
    },
    {
      icon: <FileTextOutlined />,
      title: t('featureIntro.ticketTitle', { issueLabel }),
      description: t('featureIntro.ticketDescription', { issueTrackerName, issueLabel }),
      imageSrc: ticketAutomationImage,
      tab: 'ticket',
    },
    {
      icon: <ApiOutlined />,
      title: 'Network Rewrite',
      description: t('featureIntro.networkRewriteDescription'),
      imageSrc: networkRewriteImage,
      tab: 'network-rewrite',
    },
    {
      icon: <AppstoreOutlined />,
      title: t('featureIntro.designTitle', { designTool }),
      description: t('featureIntro.designDescription', { designTool }),
      imageSrc: designHandoffImage,
      tab: 'design',
    },
    {
      icon: <MessageOutlined />,
      title: shareChannel,
      description: t('featureIntro.shareDescription', { shareChannel }),
      imageSrc: teamSharingImage,
      tab: 'share',
    },
    {
      icon: <NodeIndexOutlined />,
      title: 'Remote DevTools',
      description: t('featureIntro.remoteDevtoolsDescription'),
      imageSrc: remoteDevtoolsImage,
      tab: 'remote-devtools',
    },
  ] satisfies Array<FeatureDefinition>;

  return (
    <PageContainer title={t('featureIntro.title')}>
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
          {t('featureIntro.ctaPrompt', { appName: UX_TERMS.APP_NAME })}
        </Text>
        <Button type="primary" size="large" onClick={() => navigate(ROUTES.USER_INFO)}>
          {t('featureIntro.ctaButton')}
        </Button>
      </div>
    </PageContainer>
  );
}
