import { Tabs, Card, Typography, Alert, Button, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { PageContainer } from '@/shared/components'
import { copyToClipboard } from '@/shared/utils'
import { CONFIG, UX_TERMS } from '@/shared/constants'

const { Title, Paragraph } = Typography

const SDK_URL = CONFIG.SDK_URL || 'https://your-sdk-url.com/debug-recorder.js'
const SDK_NAME = UX_TERMS.SDK_NAME
const APP_NAME = UX_TERMS.APP_NAME

const CODE_SAMPLES = {
  html: `<!-- HTML에 직접 추가 -->
<script src="${SDK_URL}" defer></script>

<!-- 또는 body 끝에 추가 -->
<body>
  <!-- 앱 콘텐츠 -->
  <script src="${SDK_URL}"></script>
</body>`,

  nextPages: `// pages/_app.tsx
import Script from 'next/script'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Script
        src="${SDK_URL}"
        strategy="afterInteractive"
      />
      <Component {...pageProps} />
    </>
  )
}`,

  nextApp: `// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script
          src="${SDK_URL}"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}`,

  vite: `// index.html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${APP_NAME}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script src="${SDK_URL}" defer></script>
  </body>
</html>`,
  remoteDevTools: `# .env
VITE_REMOTE_DEVTOOLS_ENABLED=true
VITE_REMOTE_DEVTOOLS_API_BASE=/api/remote-devtools
VITE_REMOTE_DEVTOOLS_WS_URL=
VITE_REMOTE_DEVTOOLS_MAX_EVENTS=250

# (예시) SDK가 생성한 이벤트 엔드포인트
# GET /api/remote-devtools/sessions/:sessionId/events
# WS  /api/remote-devtools/events?sessionId={sessionId}`,
}

interface CodeBlockProps {
  code: string
  language: string
  title?: string
}

function CodeBlock({ code, language, title }: CodeBlockProps) {
  const handleCopy = async () => {
    const success = await copyToClipboard(code)
    if (success) {
      message.success('코드가 복사되었습니다')
    } else {
      message.error('복사에 실패했습니다')
    }
  }

  return (
    <Card
      size="small"
      title={title}
      extra={
        <Button
          type="text"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          size="small"
        >
          복사
        </Button>
      }
      style={{ marginBottom: 16 }}
    >
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Card>
  )
}

export function DevGuidePage() {
  const items = [
    {
      key: 'html',
      label: 'HTML',
      children: (
        <>
          <Paragraph>
            정적 HTML 페이지에 {SDK_NAME}를 추가하는 가장 간단한 방법입니다.
          </Paragraph>
          <CodeBlock
            code={CODE_SAMPLES.html}
            language="html"
            title="HTML 스크립트 태그"
          />
        </>
      ),
    },
    {
      key: 'next-pages',
      label: 'Next.js (Pages Router)',
      children: (
        <>
          <Paragraph>
            Next.js Pages Router를 사용하는 경우 _app.tsx에 Script 컴포넌트를
            추가합니다.
          </Paragraph>
          <CodeBlock
            code={CODE_SAMPLES.nextPages}
            language="typescript"
            title="_app.tsx"
          />
        </>
      ),
    },
    {
      key: 'next-app',
      label: 'Next.js (App Router)',
      children: (
        <>
          <Paragraph>
            Next.js App Router를 사용하는 경우 layout.tsx에 Script 컴포넌트를
            추가합니다.
          </Paragraph>
          <CodeBlock
            code={CODE_SAMPLES.nextApp}
            language="typescript"
            title="app/layout.tsx"
          />
        </>
      ),
    },
    {
      key: 'vite',
      label: 'Vite',
      children: (
        <>
          <Paragraph>
            Vite 프로젝트의 경우 index.html에 스크립트 태그를 추가합니다.
          </Paragraph>
          <CodeBlock
            code={CODE_SAMPLES.vite}
            language="html"
            title="index.html"
          />
        </>
      ),
    },
    {
      key: 'remote-devtools',
      label: 'Remote DevTools',
      children: (
        <>
          <Paragraph>
            디버깅 대상 앱이 원격 DevTools 이벤트를 노출하면 관리자에서 실시간으로
            관측하고 세션 제어까지 할 수 있습니다.
          </Paragraph>
          <Alert
            message="백엔드 연동 포인트"
            description="세션 목록(`/api/remote-devtools/sessions`), 이벤트(`/api/remote-devtools/sessions/:sessionId/events`), 제어 명령(`/api/remote-devtools/sessions/:sessionId/commands`)은 운영 정책에 따라 인증 미들웨어와 함께 구성하세요."
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
          <CodeBlock
            code={CODE_SAMPLES.remoteDevTools}
            language="bash"
            title="Remote DevTools 환경 변수"
          />
        </>
      ),
    },
  ]

  return (
    <PageContainer title="개발 가이드">
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>SDK 설치</Title>
        <Paragraph>
          {SDK_NAME}를 프로젝트에 설치하여 녹화 기능을 활성화할 수
          있습니다. 아래에서 프로젝트 타입에 맞는 설치 방법을 선택하세요.
        </Paragraph>
        <Alert
          message="보안 주의"
          description="SDK는 개발 및 스테이징 환경에서만 사용하는 것을 권장합니다. 프로덕션 환경에서는 환경 변수를 통해 조건부로 로드하세요."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </Card>

      <Tabs items={items} />

      <Card style={{ marginTop: 24 }}>
        <Title level={4}>환경별 조건부 로드</Title>
        <Paragraph>
          {SDK_NAME}의 로드를 운영 환경에서 제어하려면 환경 변수를
          함께 활용할 수 있습니다.
        </Paragraph>
        <CodeBlock
          code={`// 환경 변수를 통한 조건부 로드 (Next.js 예시)
{process.env.NODE_ENV !== 'production' && (
  <Script
    src="${SDK_URL}"
    strategy="afterInteractive"
  />
)}`}
          language="typescript"
          title="조건부 로드 예시"
        />
      </Card>
    </PageContainer>
  )
}
