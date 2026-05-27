# Debug Recorder Admin

<p align="center">
  <strong>웹 디버깅 세션을 수집하고 조직의 이슈 시스템과 연동 가능한 관리자 대시보드</strong>
</p>

<p align="center">
  <a href="#기능">기능</a> •
  <a href="#빠른-시작">빠른 시작</a> •
  <a href="#설치">설치</a> •
  <a href="#설정">설정</a> •
  <a href="#아키텍처">아키텍처</a> •
  <a href="#api-문서">API 문서</a> •
  <a href="#기여하기">기여하기</a>
</p>

---

## 개요

Debug Recorder Admin은 QA 팀이 웹 애플리케이션 테스트 중 발견한 이슈를 효율적으로 기록, 공유, 추적할 수 있도록 도와주는 종합 대시보드입니다. 네트워크 요청, 콘솔 로그, 스크린샷, 동영상을 자동으로 캡처하는 실시간 디버깅 기능을 제공하며, 이슈 시스템과 연동하여 원활한 티켓 생성을 지원합니다.

### 왜 범용 디버깅 운영 대시보드인가?

- **수동 재현 불필요** - 이슈 발생 전부터 자동으로 기록됩니다
- **완전한 컨텍스트** - 모든 티켓에 네트워크 로그, 콘솔 출력, 동영상 녹화가 포함됩니다
- **팀 협업** - 알림 채널을 통해 팀원과 즉시 디버깅 세션을 공유할 수 있습니다
- **티켓 연동** - 모든 디버깅 정보가 미리 입력된 티켓을 생성합니다

---

## 기능

### 🎥 녹화방 (Recording Room)
브라우저에서 발생하는 모든 것을 자동으로 캡처합니다:
- 네트워크 요청 및 응답 (XHR, Fetch, WebSocket)
- 콘솔 로그 (info, warn, error, debug)
- DOM 변경 및 사용자 인터랙션
- 스크린샷 및 화면 녹화
- 성능 메트릭

### 🎫 티켓/이슈 생성
대시보드에서 직접 티켓을 생성합니다:
- 프로젝트별 미리 설정된 템플릿
- 녹화방 링크 자동 첨부
- 커스텀 필드 지원 (Epic, 컴포넌트, 라벨)
- 팀원 검색을 통한 담당자 지정

### 🔄 네트워크 리라이트
API 응답을 조작하여 엣지 케이스를 테스트합니다:
- 요청/응답 본문 수정
- HTTP 상태 코드 변경
- 쿼리 파라미터 추가/수정
- 에러 상황 시뮬레이션

### 🎨 디자인 툴 연동
원활한 디자인 피드백 워크플로우:
- 스크린샷/컨텍스트를 디자인 툴로 직접 전달
- 이슈 주석 및 하이라이트
- 편집된 이미지를 티켓에 다시 첨부

### 🛜 Remote DevTools 연동
실시간 디버그 세션을 중앙에서 운영합니다:
- 세션 목록 조회 및 상태 모니터링
- 이벤트 타임라인 실시간 수신(WebSocket/폴백 Polling)
- 세션 시작/중단/재생·종료 제어
- 이벤트·세션 메타데이터 스냅샷 내보내기

### 📊 분석 대시보드
팀 생산성 및 도구 사용량 추적:
- 녹화방 생성 추이
- 티켓 생성 통계
- 팀원 활동
- 주간/월간 리포트

---

## 빠른 시작

```bash
# 저장소 클론
git clone https://github.com/your-org/debug-recorder-admin.git
cd debug-recorder-admin

# 의존성 설치
pnpm install

# 환경 설정 복사
cp .env.example .env

# 개발 서버 시작
pnpm dev
```

브라우저에서 `https://localhost:5173`을 엽니다.

---

## 설치

### 사전 요구사항

| 요구사항 | 버전 |
|---------|------|
| Node.js | 20.x 이상 |
| pnpm | 8.9.2 이상 |
| 모던 브라우저 | Chrome, Firefox, Safari, Edge |

### 단계별 설치

#### 1. 저장소 클론

```bash
git clone https://github.com/your-org/debug-recorder-admin.git
cd debug-recorder-admin
```

#### 2. 의존성 설치

```bash
pnpm install
```

#### 3. 환경 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 설정을 수정합니다:

```env
# 필수
VITE_API_BASE_URL=http://localhost:3000

# 선택 - 인증
VITE_ADMIN_BFF_HOST=http://localhost:4000

# 선택 - 커스터마이징
VITE_APP_NAME=Debug Recorder
VITE_APP_TITLE=Debug Recorder
VITE_SDK_URL=https://your-domain.com/sdk/index.umd.js
VITE_SDK_NAME=SDK
VITE_ISSUE_TRACKER_NAME=이슈 추적 시스템
VITE_ISSUE_LABEL=이슈
VITE_ISSUE_PROJECT_KEY_LABEL=프로젝트 키
VITE_ISSUE_PREFIX_LABEL=제목 접두어
VITE_SPREADSHEET_LABEL=스프레드시트
VITE_SHARE_CHANNEL_NAME=알림 채널
VITE_DESIGN_TOOL_NAME=디자인 툴
VITE_REMOTE_DEVTOOLS_ENABLED=true
VITE_REMOTE_DEVTOOLS_API_BASE=/api/remote-devtools
VITE_REMOTE_DEVTOOLS_WS_URL=
VITE_REMOTE_DEVTOOLS_MAX_EVENTS=250
```

#### 4. 개발 서버 시작

```bash
pnpm dev
```

#### 5. 프로덕션 빌드

```bash
pnpm build
```

빌드 결과물은 `dist/` 디렉토리에 생성됩니다.

---

## 설정

### 환경 변수

| 변수 | 설명 | 필수 | 기본값 |
|-----|------|:----:|-------|
| `VITE_API_BASE_URL` | Debug Recorder API 서버 기본 URL | ✅ | - |
| `VITE_ADMIN_BFF_HOST` | 인증/세션 관리를 위한 Admin BFF 호스트 | ❌ | - |
| `VITE_APP_NAME` | 화면에 표시되는 제품명 | ❌ | `Debug Recorder` |
| `VITE_APP_TITLE` | 헤더에 표시되는 애플리케이션 제목 | ❌ | `Debug Recorder` |
| `VITE_SDK_URL` | Debug Recorder SDK 스크립트 URL | ❌ | - |
| `VITE_SDK_NAME` | SDK 표시명 | ❌ | `SDK` |
| `VITE_ISSUE_TRACKER_NAME` | 티켓/이슈 시스템 표시명 | ❌ | `이슈 추적 시스템` |
| `VITE_ISSUE_LABEL` | 티켓/이슈 표시명 | ❌ | `이슈` |
| `VITE_ISSUE_PROJECT_KEY_LABEL` | 프로젝트 키 라벨 | ❌ | `프로젝트 키` |
| `VITE_SPREADSHEET_LABEL` | 스프레드시트 라벨 | ❌ | `스프레드시트` |
| `VITE_SHARE_CHANNEL_NAME` | 알림 채널 표시명 | ❌ | `알림 채널` |
| `VITE_DESIGN_TOOL_NAME` | 디자인 툴 표시명 | ❌ | `디자인 툴` |
| `VITE_REMOTE_DEVTOOLS_ENABLED` | Remote DevTools 연동 사용 여부 | ❌ | `false` |
| `VITE_REMOTE_DEVTOOLS_API_BASE` | Remote DevTools API Prefix | ❌ | `/api/remote-devtools` |
| `VITE_REMOTE_DEVTOOLS_WS_URL` | Remote DevTools WebSocket URL | ❌ | `-` |
| `VITE_REMOTE_DEVTOOLS_MAX_EVENTS` | 화면 이벤트 보존 최대 개수 | ❌ | `250` |
| `VITE_ICON_BASE_URL` | 원격 아이콘 기본 URL | ❌ | - |
| `VITE_DEV_HOST` | 개발 서버 호스트 | ❌ | `localhost` |
| `VITE_DEFAULT_SHEET_NAME` | TC 가져오기용 기본 스프레드시트 탭 이름 | ❌ | `DebugRecorder` |

### SSL/HTTPS 설정

개발 서버는 `mkcert`를 통해 자동 생성된 인증서로 기본적으로 HTTPS를 사용합니다. 인증서 파일은 프로젝트 루트에 생성됩니다:

- `localhost+3.pem` - 인증서
- `localhost+3-key.pem` - 개인 키

---

## 아키텍처

### 기술 스택

| 카테고리 | 기술 |
|---------|-----|
| **프레임워크** | React 19 |
| **언어** | TypeScript 5.9 |
| **빌드 도구** | Vite 7 |
| **UI 라이브러리** | Ant Design 6 |
| **상태 관리** | TanStack Query (React Query) |
| **폼** | React Hook Form |
| **차트** | Recharts |
| **라우팅** | React Router 7 |
| **HTTP 클라이언트** | Axios |

### 프로젝트 구조

```
debug-recorder-admin/
├── src/
│   ├── app/                     # 앱 진입점, 라우팅, 전역 Provider
│   │   ├── Layout.tsx           # 사이드바가 있는 메인 레이아웃
│   │   ├── providers/           # Query/Theme Provider
│   │   └── routes/              # lazy route 구성
│   │
│   ├── features/                # 기능 단위 모듈
│   │   ├── auth/                # 인증/세션
│   │   ├── dashboard/           # 분석 대시보드
│   │   ├── guide/               # 기능 소개, 사용자/개발 가이드
│   │   ├── remoteDevtools/      # 원격 DevTools 세션 관리
│   │   └── user/                # 사용자 정보 및 템플릿 설정
│   │
│   ├── shared/                  # 공통 API, 컴포넌트, 상수, 훅, 유틸
│   │   ├── api/                 # Axios 클라이언트
│   │   ├── components/          # ErrorBoundary, PageContainer 등
│   │   ├── constants/           # 환경 설정, 라우트, UX 용어
│   │   ├── hooks/               # 공통 React 훅
│   │   ├── types/               # 공통 타입
│   │   └── utils/               # 클립보드, 날짜, 문자열, 스토리지
│   │
│   ├── styles/                  # 전역 스타일
│   └── main.tsx                 # React 앱 부트스트랩
│
├── scripts/                     # 빌드 검증 스크립트
├── dist/                        # 프로덕션 빌드 출력
├── .env.example                 # 환경 템플릿
├── eslint.config.js             # ESLint 설정
├── tsconfig.json                # TypeScript 설정
├── vite.config.ts               # Vite 설정
└── package.json                 # 프로젝트 의존성
```

### 빌드 출력

프로덕션 빌드는 라우트 단위 lazy import와 vendor chunk 분리를 사용합니다.
`pnpm build`는 Vite 빌드 후 600 KiB JS chunk 예산을 함께 검증합니다.

현재 주요 JS chunk 기준:

| 청크 | 내용 | 크기 |
|-----|------|------|
| `index` | 공통 UI/Ant Design 기반 코드 | ~389 KiB |
| `DashboardPage` | 대시보드와 Recharts | ~379 KiB |
| `vendor-react` | React, React DOM, React Router | ~233 KiB |
| `UserInfoPage` | 사용자 정보/템플릿 폼 | ~142 KiB |
| `DevGuidePage` | 개발 가이드와 경량 syntax highlighter | ~72 KiB |

---

## 사용 가능한 스크립트

| 명령어 | 설명 |
|-------|------|
| `pnpm dev` | 핫 리로드로 개발 서버 시작 |
| `pnpm build` | 프로덕션 빌드 생성 및 JS chunk 예산 검증 |
| `pnpm build:budget` | 생성된 `dist`의 JS chunk 크기 검증 |
| `pnpm preview` | 프로덕션 빌드 로컬 미리보기 |
| `pnpm typecheck` | TypeScript 타입 검사 실행 |
| `pnpm lint` | ESLint 실행 |
| `pnpm lint:fix` | ESLint 이슈 자동 수정 |
| `pnpm format` | Prettier로 코드 포맷팅 |

---

## SDK 연동

웹 애플리케이션에 Debug Recorder SDK를 연동하려면:

### 기본 설치

HTML `<head>` 태그에 SDK 스크립트를 추가합니다:

```html
<script src="https://your-domain.com/sdk/index.umd.js"></script>
```

### 프레임워크별 예시

<details>
<summary><strong>Next.js (App Router)</strong></summary>

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {process.env.NODE_ENV !== 'production' && (
          <script src="https://your-domain.com/sdk/index.umd.js" />
        )}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

</details>

<details>
<summary><strong>Next.js (Pages Router)</strong></summary>

```tsx
// pages/_document.tsx
import Document, { Html, Head, Main, NextScript } from 'next/document'

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {process.env.NODE_ENV !== 'production' && (
            <script src="https://your-domain.com/sdk/index.umd.js" />
          )}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
```

</details>

<details>
<summary><strong>Vite</strong></summary>

```ts
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      {
        name: 'inject-debug-recorder',
        transformIndexHtml(html) {
          if (mode !== 'production') {
            return html.replace(
              '<head>',
              `<head>\n  <script src="${env.VITE_SDK_URL}"></script>`
            )
          }
          return html
        },
      },
    ],
  }
})
```

</details>

### 중요 사항

> ⚠️ **`defer` 또는 `async` 사용 금지** - SDK는 페이지 로드부터 이벤트를 캡처하기 위해 동기적으로 로드되어야 합니다.

> 🔒 **개발/스테이징 환경만** - 데이터 노출 위험이 있으므로 프로덕션 환경에는 SDK를 배포하지 마세요.

---

## API 문서

전체 API 문서는 [API_SPEC.md](./API_SPEC.md)를 참조하세요:

- 사용자 정보 API
- 스프레드시트 연동
- 대시보드 통계
- 워크플로우/멤버 검색
- 에러 처리
- 속도 제한

---

## 브라우저 지원

| 브라우저 | 버전 |
|---------|-----|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## 문제 해결

### 자주 발생하는 문제

<details>
<summary><strong>HTTPS 인증서 오류</strong></summary>

개발 서버는 자체 서명된 인증서를 사용합니다. 인증서 경고가 표시되면:

1. `https://localhost:5173`에 직접 접속
2. "고급" → "localhost로 이동" 클릭
3. 또는 생성된 인증서를 신뢰할 수 있는 인증서로 설치

</details>

<details>
<summary><strong>API 연결 거부</strong></summary>

API 서버가 실행 중이고 `VITE_API_BASE_URL`이 올바르게 설정되어 있는지 확인하세요:

```bash
# API 접근 가능 여부 확인
curl http://localhost:3000/health
```

</details>

<details>
<summary><strong>TypeScript 오류로 빌드 실패</strong></summary>

타입 검사를 실행하여 문제를 확인하세요:

```bash
pnpm typecheck
```

</details>

---

## 기여하기

기여를 환영합니다! 가이드라인은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참조하세요.

### 개발 워크플로우

1. 저장소 포크
2. 기능 브랜치 생성: `git checkout -b feature/amazing-feature`
3. 변경사항 작성
4. 테스트 및 린트 실행: `pnpm lint && pnpm typecheck`
5. 컨벤셔널 커밋으로 커밋: `git commit -m 'feat: 멋진 기능 추가'`
6. 포크에 푸시: `git push origin feature/amazing-feature`
7. Pull Request 생성

---

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 지원

- 📖 [문서](./API_SPEC.md)
- 🐛 [이슈 트래커](https://github.com/your-org/debug-recorder-admin/issues)
- 💬 [토론](https://github.com/your-org/debug-recorder-admin/discussions)

---

<p align="center">
  QA 팀을 위해 ❤️로 만들었습니다
</p>
