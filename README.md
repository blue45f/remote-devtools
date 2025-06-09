# 🔧 Remote Debug Tools

웹 애플리케이션을 위한 오픈소스 원격 디버깅 플랫폼입니다. 실시간 모니터링, 세션 녹화/재생, 이슈 트래킹 연동 기능을 제공합니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-blue)](https://pnpm.io/)

## 📋 목차

- [개요](#-개요)
- [주요 기능](#-주요-기능)
- [시스템 아키텍처](#-시스템-아키텍처)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [SDK 사용법](#-sdk-사용법)
- [설정](#-설정)
- [개발 가이드](#-개발-가이드)
- [배포](#-배포)
- [문제 해결](#-문제-해결)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## 🎯 개요

Remote Debug Tools는 Chrome DevTools Protocol(CDP)을 활용하여 웹 애플리케이션의 디버깅 정보를 수집, 모니터링, 재생할 수 있는 종합 디버깅 솔루션입니다.

### 이런 분들에게 유용합니다

- **QA 엔지니어**: 버그 발생 시 정확한 상황을 기록하고 개발자에게 전달
- **프론트엔드 개발자**: 원격 환경에서 발생하는 문제를 실시간으로 디버깅
- **모바일 앱 개발자**: 웹뷰 기반 하이브리드 앱의 웹 레이어 디버깅
- **고객 지원팀**: 사용자 문제를 재현하고 분석

### 핵심 가치

| 기능 | 설명 |
|------|------|
| 🟢 **실시간 디버깅** | 원격 웹 애플리케이션을 실시간으로 모니터링 |
| 📹 **세션 녹화** | 디버깅 세션을 녹화하여 분석 및 공유 |
| 🔄 **세션 재생** | 녹화된 세션을 Chrome DevTools UI로 재생 |
| 🎫 **이슈 트래킹 연동** | Jira 티켓을 디버깅 세션에서 직접 생성 |
| 📱 **모바일 지원** | 모바일 웹뷰 및 하이브리드 앱 지원 |

---

## ✨ 주요 기능

### 1. 라이브 모드 (실시간 디버깅)

원격 웹 애플리케이션을 실시간으로 디버깅합니다.

- **네트워크 모니터링**: 모든 HTTP 요청/응답 캡처
- **콘솔 로그**: console.log, error, warn 등 모든 로그 수집
- **DOM 검사**: 실시간 DOM 트리 확인
- **성능 분석**: 페이지 로딩 및 런타임 성능 모니터링

### 2. 녹화 모드 (세션 기록)

디버깅 세션을 데이터베이스에 저장하고 나중에 재생합니다.

- **자동 백업**: S3 스토리지에 자동 백업
- **완전한 재현**: 네트워크, DOM, 콘솔 상태 완벽 재현
- **타임라인 탐색**: 특정 시점으로 이동하여 분석

### 3. SDK 기능

웹 페이지에 간단히 통합하여 사용합니다.

- **자동 버퍼링**: 페이지 로드 시점부터 자동 기록
- **네트워크 리라이트**: API 응답을 모킹하여 테스트
- **세션 리플레이**: rrweb 기반 DOM 녹화/재생
- **에러 캡처**: 전역 에러 및 Promise rejection 캡처

### 4. Chrome DevTools 프론트엔드

익숙한 Chrome DevTools 인터페이스를 제공합니다.

- **Elements 패널**: DOM 트리 및 스타일 검사
- **Console 패널**: 로그 메시지 확인
- **Network 패널**: 네트워크 요청 분석
- **Session Replay 패널**: 녹화된 세션 재생

### 5. 통합 기능

외부 서비스와 연동하여 워크플로우를 자동화합니다.

- **Jira 연동**: 디버깅 정보가 포함된 티켓 자동 생성
- **Slack 연동**: 세션 생성 알림 전송
- **Google Sheets 연동**: 템플릿 관리
- **Figma 플러그인**: 디자인-개발 협업 도구

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              사용자 브라우저                                   │
├─────────────────────────────┬───────────────────────────────────────────────┤
│       웹 클라이언트          │                DevTools 클라이언트              │
│      (SDK 포함)             │              (localhost:8080)                  │
└──────────────┬──────────────┴────────────────────────┬──────────────────────┘
               │                                       │
               │ WebSocket                             │ WebSocket
               │ (CDP 데이터 전송)                       │ (실시간 데이터 수신)
               ▼                                       ▼
┌──────────────────────────────┐       ┌──────────────────────────────────────┐
│       External Server        │       │         Internal Server              │
│        (포트: 3001)          │       │          (포트: 3000)                 │
├──────────────────────────────┤       ├──────────────────────────────────────┤
│ • SDK 서빙                   │       │ • DevTools UI 서빙                    │
│ • CDP 데이터 수집             │       │ • 실시간 데이터 중계                   │
│ • 데이터베이스 저장           │       │ • 녹화 세션 재생                       │
│ • Jira/Slack 연동            │       │ • 대시보드 API                        │
└──────────────┬───────────────┘       └──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL 데이터베이스                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Record: 녹화 세션 메타데이터                                                │
│ • Network: HTTP 요청/응답 데이터                                              │
│ • Runtime: 콘솔 로그 및 에러                                                  │
│ • DOM: DOM 스냅샷                                                           │
│ • Screen: 화면 캡처 데이터                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        S3 스토리지 (선택적 백업)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ • 페이지 이탈 시 자동 백업                                                    │
│ • DeviceID/날짜/세션 구조로 저장                                              │
│ • 장기 보관 및 복구용                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 포트 구성

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Internal Server | 3000 | DevTools UI 및 실시간 중계 |
| External Server | 3001 | SDK 서빙 및 데이터 수집 |
| PostgreSQL | 5432 | 디버깅 데이터 저장 |
| PgAdmin | 5050 | 데이터베이스 관리 UI |
| Client Dev | 8080 | 개발용 웹 페이지 |

---

## 🚀 시작하기

### 필수 요구사항

- **Node.js**: v20 이상
- **pnpm**: v9 이상
- **Docker Desktop**: 로컬 개발 환경용

### 설치 방법

#### 1단계: 저장소 클론

```bash
git clone https://github.com/your-username/remote-debug-tools.git
cd remote-debug-tools
```

#### 2단계: 의존성 설치

```bash
pnpm install
```

#### 3단계: 환경변수 설정

```bash
# 환경변수 템플릿 복사
cp .env.example apps/remote-platform-internal/src/.env.local
cp .env.example apps/remote-platform-external/src/.env.local
```

필요에 따라 `.env.local` 파일을 수정합니다. 기본값으로도 로컬 개발이 가능합니다.

#### 4단계: Docker Compose로 서비스 시작

```bash
# 데이터베이스 및 서버 시작
pnpm compose
```

Docker Compose가 실행되면:
- PostgreSQL 데이터베이스 (포트 5432)
- External Server (포트 3001)
- Internal Server (포트 3000)
- PgAdmin (포트 5050)

#### 5단계: 클라이언트 개발 서버 시작 (선택)

```bash
# 새 터미널에서
cd client
pnpm dev
```

### 접속 URL

| URL | 설명 |
|-----|------|
| http://localhost:8080 | 테스트용 웹 페이지 |
| http://localhost:8080/rooms | 녹화 세션 목록 |
| http://localhost:5050 | PgAdmin (admin@example.com / admin) |

---

## 📁 프로젝트 구조

```
remote-debug-tools/
├── apps/                              # 백엔드 애플리케이션
│   ├── remote-platform-external/      # External 서버 (SDK, 데이터 수집)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── webview/          # WebSocket 게이트웨이
│   │   │   │   ├── buffer/           # 버퍼 데이터 관리
│   │   │   │   ├── jira/             # Jira 연동
│   │   │   │   ├── slack/            # Slack 연동
│   │   │   │   └── s3/               # S3 백업
│   │   │   └── main.ts
│   │   └── tsconfig.app.json
│   │
│   └── remote-platform-internal/      # Internal 서버 (관리, 재생)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── dashboard/        # 대시보드 API
│       │   │   ├── session-replay/   # 세션 재생
│       │   │   └── google-sheets/    # Google Sheets 연동
│       │   └── main.ts
│       └── tsconfig.app.json
│
├── sdk/                               # 프론트엔드 SDK
│   ├── common/                        # 공통 유틸리티
│   │   ├── remoteDebugger.ts         # 메인 디버거 클래스
│   │   └── remoteObject.ts           # CDP 객체 변환
│   ├── domain/                        # CDP 도메인 구현
│   │   ├── network.ts                # Network 도메인
│   │   ├── runtime.ts                # Runtime 도메인
│   │   ├── dom.ts                    # DOM 도메인
│   │   └── session-replay.ts         # 세션 리플레이
│   ├── ui/                           # UI 컴포넌트
│   │   ├── debuggerButtons.ts        # 플로팅 버튼
│   │   ├── ticketModal/              # 티켓 생성 모달
│   │   └── networkRewriteModal.ts    # 네트워크 리라이트 모달
│   ├── index.ts                      # SDK 엔트리포인트
│   └── vite.config.ts
│
├── client/                            # Next.js 클라이언트
│   ├── app/
│   │   ├── rooms/                    # 세션 목록 페이지
│   │   └── test/                     # 테스트 페이지
│   └── components/
│       └── Webview.tsx               # SDK 통합 컴포넌트
│
├── libs/                              # 공유 라이브러리
│   ├── entity/                       # TypeORM 엔티티
│   │   ├── record.entity.ts
│   │   ├── network.entity.ts
│   │   └── ...
│   └── constants/                    # 공유 상수
│
├── devtools-frontend/                 # Chrome DevTools UI
│   ├── panels/                       # DevTools 패널
│   │   └── session_replay/           # 세션 리플레이 패널
│   └── tabbed/                       # 탭 인터페이스
│
├── figma-plugin/                      # Figma 플러그인
│   ├── src/
│   │   ├── code.ts                   # 플러그인 메인 코드
│   │   └── ui.html                   # 플러그인 UI
│   └── manifest.json
│
├── docker-compose.yml                 # Docker 구성
├── Dockerfile                         # 컨테이너 빌드
└── package.json                       # 루트 패키지 설정
```

---

## 📱 SDK 사용법

### 기본 통합

웹 페이지에 SDK 스크립트를 추가합니다:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <!-- 페이지 내용 -->
  
  <!-- SDK 로드 -->
  <script>
    function handleSdkLoad() {
      if (window.RemoteDebugSdk) {
        // 디버거 활성화 (자동 버퍼링 모드)
        window.RemoteDebugSdk.createDebugger();
      }
    }
  </script>
  <script 
    src="http://localhost:3001/sdk/index.umd.js" 
    onload="handleSdkLoad()"
  ></script>
</body>
</html>
```

### SDK 옵션

```javascript
// 기본 사용 (자동 버퍼링 활성화)
window.RemoteDebugSdk.createDebugger();

// 콜백과 함께 사용
window.RemoteDebugSdk.createDebugger(() => {
  console.log('디버거 버튼 클릭됨');
});

// 자동 버퍼링 비활성화
window.RemoteDebugSdk.createDebugger(null, false);
```

### SDK 기능 상세

#### 1. 플로팅 버튼

SDK를 로드하면 화면 우하단에 플로팅 버튼이 표시됩니다:

- **녹화 시작**: 현재 세션을 녹화하여 저장
- **QA 티켓 만들기**: Jira 티켓 생성 모달 열기
- **Network Rewrite**: API 응답 모킹 설정

#### 2. 네트워크 리라이트

특정 API 응답을 모킹하여 다양한 시나리오를 테스트할 수 있습니다:

```javascript
// SDK 내부에서 자동으로 처리됨
// UI를 통해 설정하거나 프로그래밍 방식으로 사용
```

#### 3. 세션 리플레이

녹화된 세션은 다음 정보를 포함합니다:

- DOM 변경 이력 (rrweb 기반)
- 네트워크 요청/응답
- 콘솔 로그
- 에러 및 스택 트레이스
- 화면 스크린샷

### React/Next.js 통합 예시

```tsx
'use client';

import Script from 'next/script';

export default function App() {
  const handleSdkLoad = () => {
    if (typeof window !== 'undefined' && window.RemoteDebugSdk) {
      window.RemoteDebugSdk.createDebugger();
    }
  };

  return (
    <>
      <Script
        src="http://localhost:3001/sdk/index.umd.js"
        strategy="beforeInteractive"
        onLoad={handleSdkLoad}
      />
      {/* 앱 컴포넌트 */}
    </>
  );
}
```

### 타입 정의 (TypeScript)

```typescript
// global.d.ts
interface Window {
  RemoteDebugSdk?: {
    createDebugger: (
      onClickCallback?: () => void,
      autoConnect?: boolean
    ) => void;
  };
}
```

---

## ⚙️ 설정

### 환경변수 상세

`.env.example` 파일을 참고하여 환경변수를 설정합니다:

#### 서버 설정

```bash
NODE_ENV=development          # 실행 환경 (development/production)
APP_ENV=development           # 앱 환경
PORT=3000                     # 서버 포트
```

#### 데이터베이스 설정

```bash
DB_HOST=localhost             # PostgreSQL 호스트
DB_PORT=5432                  # PostgreSQL 포트
DB_USERNAME=myuser            # 데이터베이스 사용자명
DB_PASSWORD=mypassword        # 데이터베이스 비밀번호
DB_DATABASE=mydb              # 데이터베이스 이름
```

#### AWS S3 설정 (선택)

```bash
AWS_REGION=ap-northeast-2     # AWS 리전
AWS_S3_BUCKET=your-bucket     # S3 버킷 이름
# AWS_ACCESS_KEY_ID=          # 프로덕션에서는 IAM 역할 사용 권장
# AWS_SECRET_ACCESS_KEY=
```

#### CORS 설정

```bash
# 쉼표로 구분된 허용 도메인 (프로토콜 제외)
CORS_ALLOWED_ORIGINS=example.com,myapp.com
```

#### Jira 연동 (선택)

```bash
JIRA_HOST=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT=PROJECT_KEY
```

#### Slack 연동 (선택)

```bash
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL_ID=C0000000000
```

#### Google Sheets 연동 (선택)

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=spreadsheet-id
```

---

## 💻 개발 가이드

### 개발 서버 실행

```bash
# Internal 서버 개발 모드
pnpm start:internal:dev

# External 서버 개발 모드
pnpm start:external:dev

# 클라이언트 개발 모드
cd client && pnpm dev
```

### SDK 빌드

```bash
cd sdk
pnpm build

# 빌드 결과:
# - dist/index.mjs (ES Module)
# - dist/index.umd.js (UMD)
```

### 타입 체크

```bash
pnpm typecheck
```

### 린트

```bash
pnpm eslint apps libs sdk --ext .ts
```

### 프로덕션 빌드

```bash
# Internal 서버 빌드
pnpm build:internal

# External 서버 빌드
pnpm build:external

# 모든 서버 병렬 빌드
pnpm build:internal:all
pnpm build:external:all
```

---

## 🚢 배포

### Docker 배포

```bash
# 이미지 빌드
docker build -t remote-debug-tools .

# 컨테이너 실행
docker run -p 3000:3000 -p 3001:3001 remote-debug-tools
```

### PM2 배포

```bash
# PM2로 실행
pm2 start ecosystem.config.js

# 또는
pnpm start:container
```

### 환경별 빌드

```bash
# 프로덕션 SDK 빌드
cd sdk
VITE_INTERNAL_HOST=https://your-internal.com \
VITE_EXTERNAL_HOST=https://your-external.com \
pnpm build
```

---

## 🔧 문제 해결

### 자주 발생하는 문제

#### 1. WebSocket 연결 실패

```
Error: WebSocket connection failed
```

**해결 방법:**
- 서버가 실행 중인지 확인
- 방화벽 설정 확인
- CORS 설정에 도메인이 포함되어 있는지 확인

#### 2. 데이터베이스 연결 실패

```
Error: Connection refused to PostgreSQL
```

**해결 방법:**
- Docker Compose가 실행 중인지 확인: `docker-compose ps`
- 데이터베이스 포트(5432)가 사용 가능한지 확인
- 환경변수가 올바르게 설정되었는지 확인

#### 3. SDK 로드 실패

```
Error: RemoteDebugSdk is not defined
```

**해결 방법:**
- External 서버(포트 3001)가 실행 중인지 확인
- 스크립트 URL이 올바른지 확인
- CORS 설정 확인

#### 4. 세션 재생 실패

```
Error: Session data not found
```

**해결 방법:**
- 녹화 세션이 정상적으로 저장되었는지 확인
- S3 백업이 활성화된 경우 버킷 권한 확인
- 데이터베이스에 데이터가 있는지 PgAdmin으로 확인

### 로그 확인

```bash
# Docker 로그 확인
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f external
docker-compose logs -f internal
```

---

## 🤝 기여하기

프로젝트에 기여해 주셔서 감사합니다! 다음 가이드라인을 따라주세요.

### 기여 방법

1. **저장소 Fork**
   ```bash
   git clone https://github.com/your-username/remote-debug-tools.git
   ```

2. **기능 브랜치 생성**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **변경사항 커밋**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```

4. **브랜치 푸시**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Pull Request 생성**

### 커밋 메시지 컨벤션

```
<type>: <description>

[optional body]
```

**Type:**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 변경

### 코드 스타일

- TypeScript 사용
- ESLint + Prettier 설정 준수
- 함수/변수명은 camelCase
- 컴포넌트/클래스명은 PascalCase

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받았습니다:

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - 디버깅 프로토콜
- [rrweb](https://github.com/rrweb-io/rrweb) - 세션 녹화/재생
- [NestJS](https://nestjs.com/) - 백엔드 프레임워크
- [Next.js](https://nextjs.org/) - 프론트엔드 프레임워크
- [TypeORM](https://typeorm.io/) - ORM

---

## 📞 문의

- **이슈 리포트**: [GitHub Issues](https://github.com/your-username/remote-debug-tools/issues)
- **기능 제안**: [GitHub Discussions](https://github.com/your-username/remote-debug-tools/discussions)
