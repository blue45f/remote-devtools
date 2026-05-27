import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Steps from 'antd/es/steps'
import Tabs from 'antd/es/tabs'
import type { TabsProps } from 'antd/es/tabs'
import Typography from 'antd/es/typography'
import { type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/shared/components'
import { ROUTES, UX_TERMS } from '@/shared/constants'

const { Title, Paragraph } = Typography

type GuideTab =
  | 'recording'
  | 'ticket'
  | 'network-rewrite'
  | 'design'
  | 'share'
  | 'remote-devtools'

const VALID_TABS = new Set<GuideTab>([
  'recording',
  'ticket',
  'network-rewrite',
  'design',
  'share',
  'remote-devtools',
])

function TabPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Title level={4}>{title}</Title>
      {children}
    </Card>
  )
}

export function UserGuidePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab')
  const initialKey: GuideTab = VALID_TABS.has(activeTab as GuideTab)
    ? (activeTab as GuideTab)
    : 'recording'

  const onTabChange = (nextTab: string) => {
    setSearchParams({ tab: nextTab })
  }

  const issueTrackerName = UX_TERMS.ISSUE_TRACKER_NAME
  const issueLabel = UX_TERMS.ISSUE_LABEL

  const issueCreateLabel = `${issueTrackerName} ${issueLabel} 자동 생성`
  const designTool = UX_TERMS.DESIGN_TOOL_NAME
  const spreadsheet = UX_TERMS.SPREADSHEET_LABEL
  const shareChannel = UX_TERMS.SHARE_CHANNEL_NAME
  const appName = UX_TERMS.APP_NAME
  const sdkName = UX_TERMS.SDK_NAME

  const items: TabsProps['items'] = [
    {
      key: 'recording',
      label: '녹화방 사용법',
      children: (
        <TabPanel title="녹화방 생성 및 사용">
          <Steps
            direction="vertical"
            current={-1}
            items={[
              {
                title: '녹화방 생성',
                description: `${appName}가 설치된 페이지에서 녹화 버튼을 클릭합니다.`,
              },
              {
                title: '녹화 시작',
                description:
                  '녹화가 시작되면 화면 녹화와 함께 네트워크 요청, 콘솔 로그가 자동으로 캡처됩니다.',
              },
              {
                title: '녹화 종료',
                description:
                  '녹화를 종료하면 수집된 데이터가 서버에 저장됩니다.',
              },
              {
                title: '공유',
                description: `${shareChannel}를 통해 녹화방 링크를 빠르게 공유할 수 있습니다.`,
              },
            ]}
          />
        </TabPanel>
      ),
    },
    {
      key: 'ticket',
      label: `${issueLabel} 생성`,
      children: (
        <TabPanel title={issueCreateLabel}>
          <Paragraph>
            녹화방에서 수집된 정보를 바탕으로 자동으로 {issueLabel}을(를)
            생성할 수 있습니다.
          </Paragraph>
          <Alert
            message="사전 설정 필요"
            description={
              <span>
                {issueLabel}을 생성하려면 먼저{' '}
                <a onClick={() => navigate(ROUTES.USER_INFO)}>유저 정보</a>에서 템플릿을
                설정해야 합니다.
              </span>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Steps
            direction="vertical"
            current={-1}
            items={[
              {
                title: '템플릿 선택',
                description: '미리 설정한 템플릿 중 하나를 선택합니다.',
              },
              {
                title: '정보 확인',
                description:
                  '자동으로 채워진 정보를 확인하고 필요시 수정합니다.',
              },
              {
                title: `${issueLabel} 생성`,
                description: `선택한 규칙으로 ${issueLabel}이(가) 생성됩니다.`,
              },
            ]}
          />
        </TabPanel>
      ),
    },
    {
      key: 'network-rewrite',
      label: 'Network Rewrite',
      children: (
        <TabPanel title="Network Rewrite">
          <Paragraph>
            API 응답을 수정하여 다양한 상황을 테스트할 수 있습니다.
          </Paragraph>
          <Steps
            direction="vertical"
            current={-1}
            items={[
              {
                title: 'Rewrite 규칙 추가',
                description: '수정할 API 엔드포인트와 응답 내용을 설정합니다.',
              },
              {
                title: '규칙 활성화',
                description: '설정한 규칙을 활성화하면 해당 API 호출 시 수정된 응답이 반환됩니다.',
              },
              {
                title: '테스트',
                description:
                  '에러 상황이나 엣지 케이스를 쉽게 재현하여 테스트할 수 있습니다.',
              },
            ]}
          />
        </TabPanel>
      ),
    },
    {
      key: 'design',
      label: `${designTool} 연동`,
      children: (
        <TabPanel title={`${designTool} 연동`}>
          <Paragraph>
            녹화방을 {designTool} 워크플로우와 연계해 QA 피드백 루프를 빠르게
            돌릴 수 있습니다.
          </Paragraph>
          <Steps
            direction="vertical"
            current={-1}
            items={[
              {
                title: `${designTool} 연동`,
                description: `${designTool}에서 ${appName} 관련 플러그인/확장 기능을 사용합니다.`,
              },
              {
                title: '요청 생성',
                description:
                  '워크플로우 내에서 녹화방을 기준으로 이슈 컨텍스트를 전파합니다.',
              },
            ]}
          />
        </TabPanel>
      ),
    },
    {
      key: 'share',
      label: `${shareChannel} 연동`,
      children: (
        <TabPanel title={`${shareChannel} 연동`}>
          <Paragraph>
            녹화 완료 시 {shareChannel}로 링크/컨텍스트를 공유해 팀원과 신속히
            협업할 수 있습니다.
          </Paragraph>
          <Steps
            direction="vertical"
            current={-1}
            items={[
              {
                title: '알림 정책 설정',
                description: `${shareChannel}에 전송할 메시지 형식을 구성합니다.`,
              },
              {
                title: '실시간 공유',
                description: '녹화 완료 즉시 팀 채널로 공유됩니다.',
              },
            ]}
          />
        </TabPanel>
      ),
    },
    {
      key: 'remote-devtools',
      label: 'Remote DevTools',
      children: (
        <TabPanel title="원격 DevTools 통합 가이드">
          <Paragraph>
            녹화 세션·네트워크 이벤트·디버그 신호를 한 화면에서 확인하고
            제어할 수 있습니다.
          </Paragraph>
          <Steps
            direction="vertical"
            current={-1}
            items={[
              {
                title: '연동 준비',
                description:
                  'SDK/도구 설정에서 Remote DevTools 연결 항목을 활성화하고 서버 URL을 등록합니다.',
              },
              {
                title: '세션 선택',
                description:
                  '원격 DevTools 페이지에서 수집 중인 세션을 선택하고 실시간 이벤트를 모니터링합니다.',
              },
              {
                title: '명령 제어',
                description:
                  '시작/중지/재생 명령으로 필요 시 디버그 흐름을 제어할 수 있습니다.',
              },
            ]}
          />
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate(ROUTES.REMOTE_DEVTOOLS)}>
              Remote DevTools 열기
            </Button>
          </div>
        </TabPanel>
      ),
    },
  ]

  return (
    <PageContainer title="유저 가이드">
      <Tabs
        activeKey={initialKey}
        onChange={onTabChange}
        items={items}
      />
      <Alert
        style={{ marginTop: 16 }}
        message={`${spreadsheet} 연동 가이드`}
        description={
          <>
            현재 설정은 `{spreadsheet}` 기반 템플릿 동기화 방식으로 동작합니다.
            {` ${sdkName} 설치 후 녹화 정보를 수집하면 `}{issueLabel}
            생성 플로우와 연동할 수 있습니다.
          </>
        }
        type="info"
      />
      <Card style={{ marginTop: 16 }}>
        <Title level={5} style={{ marginBottom: 8 }}>
          참고: 템플릿 시트 항목
        </Title>
        <Paragraph>
          `Project`, `Epic`, `Title Prefix` 항목은 각 조직 규칙에 맞게
          매핑해 활용할 수 있습니다.
        </Paragraph>
      </Card>
    </PageContainer>
  )
}
