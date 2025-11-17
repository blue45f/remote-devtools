# Remote DevTools

웹 애플리케이션을 위한 원격 디버깅 플랫폼. Chrome DevTools Protocol(CDP) 기반으로 실시간 모니터링, 세션 녹화/재생, 이슈 트래킹 연동을 지원한다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | NestJS 11, TypeORM, PostgreSQL |
| 클라이언트 | React 19, Vite, Tailwind CSS |
| SDK | TypeScript, Vite (UMD/ESM 빌드) |
| DevTools UI | Chrome DevTools Protocol 기반 커스텀 프론트엔드 |
| 테스트 | Vitest |
| 린트 | ESLint flat config (`eslint.config.mjs`) |
| 패키지 매니저 | pnpm 9+ |
| 런타임 | Node.js 20+ |

## 주요 기능

- **실시간 디버깅** -- 원격 웹앱의 네트워크, 콘솔, DOM을 실시간으로 모니터링
- **세션 녹화/재생** -- rrweb 기반 DOM 녹화 + CDP 데이터 저장, DevTools UI에서 타임라인 재생
- **Jira 연동** -- Jira REST API v3를 직접 호출하여 디버깅 정보가 포함된 티켓 생성
- **Slack 연동** -- 세션 생성 시 채널 알림 전송
- **Google Sheets 연동** -- 테스트 케이스 템플릿 관리
- **AWS S3 백업** -- 세션 데이터 자동 백업 및 복구
- **Figma 플러그인** -- 디자이너-개발자 협업 도구
- **네트워크 리라이트** -- SDK에서 API 응답을 모킹하여 테스트

## 아키텍처

```
SDK (웹 페이지)  ──WebSocket──>  External Server (3001)  ──>  PostgreSQL
                                       │                         ^
                                       v                         │
                                    S3 백업               Internal Server (3000)
                                                               │
DevTools UI  <──WebSocket──────────────────────────────────────┘
Client App   <──HTTP────────────────────────────────────────────┘
```

### 백엔드 앱

| 앱 | 포트 | 역할 |
|----|------|------|
| `remote-platform-external` | 3001 | SDK 서빙, CDP 데이터 수집, Jira/Slack 연동 |
| `remote-platform-internal` | 3000 | DevTools UI 서빙, 세션 재생, 대시보드, Google Sheets 연동 |

### 공유 라이브러리 (libs/)

| 라이브러리 | 설명 |
|-----------|------|
| `core` | 데이터베이스 설정, 공통 서비스 (DOM, Network, Runtime, Screen, Record) |
| `entity` | TypeORM 엔티티 정의 |
| `common` | 공통 예외 처리, 필터, 인터셉터 |
| `constants` | 공유 상수 |
| `interfaces` | 공유 타입 정의 |

## 프로젝트 구조

```
remote-devtools/
├── apps/
│   ├── remote-platform-external/   # External 서버
│   └── remote-platform-internal/   # Internal 서버
├── libs/
│   ├── core/                       # DB 설정, 공통 서비스
│   ├── entity/                     # TypeORM 엔티티
│   ├── common/                     # 예외, 필터, 인터셉터
│   ├── constants/                  # 상수
│   └── interfaces/                 # 타입
├── sdk/                            # 프론트엔드 SDK (Vite 빌드)
├── client/                         # React 19 + Vite 클라이언트
├── devtools-frontend/              # Chrome DevTools UI
├── figma-plugin/                   # Figma 플러그인
├── eslint.config.mjs               # ESLint flat config
├── nest-cli.json                   # NestJS 모노레포 설정
├── docker-compose.yml
└── package.json
```

## 빠른 시작

```bash
# 1. 저장소 클론
git clone <repository-url>
cd remote-devtools

# 2. 의존성 설치
pnpm install

# 3. 환경변수 설정
cp .env.example apps/remote-platform-external/src/.env.local
cp .env.example apps/remote-platform-internal/src/.env.local

# 4. Docker Compose로 전체 서비스 시작 (DB + 서버)
pnpm compose
```

시작되면 다음 서비스에 접근할 수 있다:

- `http://localhost:3000` -- Internal 서버 (DevTools UI, API)
- `http://localhost:3001` -- External 서버 (SDK 서빙, WebSocket)
- `http://localhost:8080` -- Client (별도 실행: `cd client && pnpm dev`)
  - `/` -- SDK 데모 페이지 (NPM 모듈 로드)
  - `/test` -- SDK 테스트 페이지 (스크립트 태그 로드)
  - `/sessions` -- 녹화/라이브 세션 목록
  - `/dashboard` -- 대시보드 (통계 및 트렌드 차트)
- `http://localhost:5050` -- PgAdmin (DB 관리)

상세 설치 방법은 [docs/INSTALLATION.md](docs/INSTALLATION.md) 참조.

## 개발 명령어

```bash
# 개별 서버 개발 모드
pnpm start:internal:dev         # Internal 서버 (watch 모드)
pnpm start:external:dev         # External 서버 (watch 모드)

# 클라이언트 개발 서버
cd client && pnpm dev

# SDK 빌드
cd sdk && pnpm build            # dist/index.mjs, dist/index.umd.js

# 프로덕션 빌드
pnpm build:all                  # Internal + External 동시 빌드

# 테스트
pnpm test                       # Vitest 실행
pnpm test:watch                 # watch 모드
pnpm test:cov                   # 커버리지

# 린트 및 포맷
pnpm lint                       # ESLint (flat config)
pnpm format                     # Prettier

# 타입 체크
pnpm typecheck

# DevTools 핫 리로드 개발
pnpm devtools:dev               # browser-sync (포트 3002)
```

## SDK 사용법

웹 페이지에 SDK 스크립트를 추가하면 원격 디버깅이 활성화된다:

```html
<script>
  function handleSdkLoad() {
    if (window.RemoteDebugSdk) {
      window.RemoteDebugSdk.createDebugger();
    }
  }
</script>
<script
  src="http://localhost:3001/sdk/index.umd.js"
  onload="handleSdkLoad()"
></script>
```

SDK가 로드되면 화면에 플로팅 버튼이 나타나며, 녹화 시작 / 티켓 생성 / 네트워크 리라이트 기능을 사용할 수 있다.

### TypeScript 타입 정의

```typescript
interface Window {
  RemoteDebugSdk?: {
    createDebugger: (
      onClickCallback?: () => void,
      autoConnect?: boolean,
    ) => void;
  };
}
```

## 환경변수

`.env.example`을 참고하여 설정한다. 기본값으로 로컬 개발이 가능하다.

| 구분 | 변수 | 설명 |
|------|------|------|
| 서버 | `NODE_ENV`, `APP_ENV`, `PORT` | 실행 환경, 포트 |
| DB | `DB_WRITER_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL 연결 |
| CORS | `CORS_ALLOWED_ORIGINS` | 허용 도메인 (쉼표 구분) |
| AWS | `AWS_REGION`, `AWS_S3_BUCKET` | S3 백업 (선택) |
| Jira | `JIRA_HOST_URL`, `JIRA_API_EMAIL`, `JIRA_API_TOKEN` | Jira REST API v3 (선택) |
| Slack | `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` | Slack 알림 (선택) |
| Google | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SPREADSHEET_ID` | Google Sheets (선택) |
| SDK | `VITE_INTERNAL_HOST`, `VITE_EXTERNAL_HOST` | SDK 빌드 시 서버 주소 (선택) |
| 기타 | `EXTERNAL_HOST`, `INTERNAL_HOST`, `WORKFLOW_API_URL` | 서버 간 통신 (선택) |

## 배포

```bash
# Docker 빌드 및 실행
docker build -t remote-devtools .
docker run -p 3000:3000 -p 3001:3001 remote-devtools

# PM2 실행
pnpm start:container
```

## 라이선스

MIT
