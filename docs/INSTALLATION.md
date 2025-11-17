# 설치 가이드

Remote DevTools의 로컬 개발 환경 설정 및 배포 방법을 안내한다.

---

## 요구사항

| 소프트웨어 | 버전 | 비고 |
|-----------|------|------|
| Node.js | 20 이상 | 22.x 권장 |
| pnpm | 9 이상 | `corepack enable` 으로 설치 가능 |
| Docker Desktop | 최신 | PostgreSQL 실행용 |

선택 사항:

- PostgreSQL 15+ -- Docker 없이 로컬 DB를 직접 운영할 경우
- AWS CLI -- S3 백업 기능을 사용할 경우

---

## 로컬 개발 환경 설정

### 1. Node.js 및 pnpm 설치

```bash
# macOS (Homebrew)
brew install node@22

# 또는 nvm 사용
nvm install 22
nvm use 22

# pnpm 설치
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd remote-devtools
pnpm install
```

pnpm workspace 기반으로 다음이 한번에 설치된다:

- `apps/remote-platform-external` -- External 백엔드
- `apps/remote-platform-internal` -- Internal 백엔드
- `client` -- React 19 + Vite 클라이언트
- `sdk` -- 프론트엔드 SDK
- `figma-plugin` -- Figma 플러그인
- `libs/*` -- 공유 라이브러리 (core, entity, common, constants, interfaces)

### 3. 환경변수 설정

```bash
cp .env.example apps/remote-platform-external/src/.env.local
cp .env.example apps/remote-platform-internal/src/.env.local
```

기본값으로 로컬 개발이 가능하다. 외부 서비스 연동(Jira, Slack, S3 등)이 필요한 경우에만 수정한다.

주요 환경변수:

```bash
# 앱 환경 (development, beta, production)
APP_ENV=development

# 데이터베이스
DB_WRITER_HOST=localhost
DB_PORT=5432
DB_USER=myuser
DB_PASSWORD=mypassword
DB_NAME=mydb

# 서버 간 통신
EXTERNAL_HOST=http://localhost:3001
INTERNAL_HOST=http://localhost:3000

# Jira (선택) -- REST API v3 직접 호출
JIRA_HOST_URL=https://your-domain.atlassian.net
JIRA_API_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
# Jira 프로젝트 키는 사용자별로 DB에서 관리 (jiraProjectKey)

# Slack (선택)
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL_ID=C0000000000

# AWS S3 (선택)
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your-bucket

# Google Sheets (선택)
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=spreadsheet-id

# CORS
CORS_ALLOWED_ORIGINS=example.com,myapp.com
```

### 4. 서비스 시작

#### 방법 A: Docker Compose (권장)

```bash
pnpm compose
```

PostgreSQL, External 서버(3001), Internal 서버(3000), PgAdmin(5050)이 한번에 시작된다.

#### 방법 B: 개별 실행

```bash
# 터미널 1 -- 데이터베이스
docker-compose up postgres

# 터미널 2 -- External 서버
pnpm start:external:dev

# 터미널 3 -- Internal 서버
pnpm start:internal:dev

# 터미널 4 -- 클라이언트 (선택)
cd client && pnpm dev
```

### 5. 설치 확인

```bash
# 서버 헬스 체크
curl http://localhost:3000/health
curl http://localhost:3001/health

# DB 연결 확인
docker-compose exec postgres pg_isready
```

| URL | 설명 |
|-----|------|
| http://localhost:3000 | Internal 서버 (DevTools UI) |
| http://localhost:3001 | External 서버 (SDK, API) |
| http://localhost:5050 | PgAdmin (DB 관리) |

---

## 6. 사용자 프로필 및 Jira 설정 (로컬 개발)

SDK에서 Jira 티켓 생성 기능을 사용하려면 DB에 **사용자 프로필**, **디바이스**, **티켓 템플릿**이 등록되어 있어야 한다. 이 설정이 없으면 SDK에서 "Could not load ticket template data" 에러가 발생한다.

### 데이터 구조

```
users (사용자)
  └─ device_info_list (디바이스 -- deviceId로 사용자 식별)
  └─ ticket_template_list (티켓 템플릿 -- jiraProjectKey 필수)
```

### 방법 A: REST API 사용 (기존 사용자 업데이트)

기존에 등록된 사용자가 있다면 API로 업데이트한다:

```bash
curl -X PUT "http://localhost:3000/api/user-profile/{empNo}/upsert" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "홍길동",
    "username": "gildong.hong",
    "jobType": "QA",
    "empNo": "00000001",
    "email": "user@example.com",
    "deviceInfoList": [
      { "deviceId": "unknown-device", "deviceName": "Local Browser" },
      { "deviceId": "OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1", "deviceName": "SDK Fallback" }
    ],
    "ticketTemplateList": [
      {
        "name": "기본 템플릿",
        "jiraProjectKey": "YOUR_PROJECT_KEY",
        "titlePrefix": "[QA] ",
        "assigneeInfoList": [],
        "componentList": [],
        "labelList": ["QA", "bug"]
      }
    ]
  }'
```

> **참고**: 신규 사용자 생성 시 Workflow API를 통한 Slack 사용자 조회가 필요하다. Workflow API가 없는 로컬 환경에서는 방법 B를 사용한다.

### 방법 B: SQL 직접 실행 (권장 -- 로컬 개발)

외부 서비스(Slack, Workflow API) 없이 데이터를 직접 등록한다:

```bash
PGPASSWORD=mypassword psql -h localhost -U myuser -d mydb << 'SQL'
-- 1. 사용자 생성
INSERT INTO users (name, username, job_type, slack_id, emp_no, created_at, updated_at)
VALUES ('홍길동', 'gildong.hong', 'QA', 'local-dev-user', '00000001', NOW(), NOW());

-- 2. 디바이스 등록
--    SDK는 commonInfo가 없으면 두 가지 fallback deviceId를 사용한다:
--    - 일반 연결: "unknown-device"
--    - 티켓 모달: "OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1" (하드코딩)
INSERT INTO device_info_list (user_id, device_id, device_name, created_at, updated_at)
SELECT id, 'unknown-device', 'Local Browser', NOW(), NOW()
FROM users WHERE emp_no = '00000001';

INSERT INTO device_info_list (user_id, device_id, device_name, created_at, updated_at)
SELECT id, 'OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1', 'SDK Fallback', NOW(), NOW()
FROM users WHERE emp_no = '00000001';

-- 3. 티켓 템플릿 생성 (jiraProjectKey 필수)
INSERT INTO ticket_template_list (user_id, name, jira_project_key, title_prefix, assignee_info_list, component_list, label_list, created_at, updated_at)
SELECT id, '기본 템플릿', 'YOUR_PROJECT_KEY', '[QA] ',
  '[]'::jsonb, '[]'::jsonb, '["QA", "bug"]'::jsonb,
  NOW(), NOW()
FROM users WHERE emp_no = '00000001';
SQL
```

### jiraProjectKey 확인 방법

`jiraProjectKey`는 Jira 프로젝트의 고유 키이다. 확인 방법:

1. Jira 보드 URL에서 확인: `https://your-domain.atlassian.net/jira/software/projects/{KEY}/board`
2. Jira REST API로 조회:
   ```bash
   curl -u "email:api-token" "https://your-domain.atlassian.net/rest/api/3/project" | python3 -m json.tool
   ```

### SDK deviceId 참고사항

| 상황 | 사용되는 deviceId |
|------|-----------------|
| 네이티브 앱(웹뷰) | `commonInfo.device.deviceId` (앱에서 전달) |
| 브라우저 (commonInfo 없음) -- 일반 연결 | `"unknown-device"` |
| 브라우저 (commonInfo 없음) -- 티켓 모달 | `"OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1"` |

로컬 개발 시 위 두 가지 fallback deviceId를 모두 등록해야 SDK의 모든 기능이 정상 동작한다.

### 설정 확인

```bash
# 사용자 조회
curl http://localhost:3000/api/user-profile/00000001

# 티켓 템플릿 로드 테스트 (SDK 티켓 모달이 호출하는 API)
curl "http://localhost:3000/api/user-templates?deviceId=OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1"

# 티켓 폼 데이터 로드 테스트
curl "http://localhost:3000/api/ticket-form-data?deviceId=OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1"
```

모든 요청이 `{"success": true, ...}`로 응답하면 설정이 완료된 것이다.

---

## SDK 빌드

```bash
cd sdk
pnpm build
```

빌드 결과물:

- `dist/index.mjs` -- ES Module
- `dist/index.umd.js` -- UMD (script 태그용)

프로덕션 SDK 빌드 시 서버 호스트를 지정한다:

```bash
VITE_INTERNAL_HOST=https://internal.example.com \
VITE_EXTERNAL_HOST=https://external.example.com \
VITE_INTERNAL_WS=wss://internal.example.com \
VITE_EXTERNAL_WS=wss://external.example.com \
pnpm build
```

---

## 프로덕션 빌드

```bash
# 백엔드 빌드
pnpm build:internal
pnpm build:external

# 또는 동시 빌드
pnpm build:all

# 클라이언트 빌드
cd client && pnpm build
```

---

## 배포

### Docker

```bash
docker build -t remote-devtools .
docker run -d \
  -p 3000:3000 \
  -p 3001:3001 \
  -e DB_WRITER_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_USER=your-user \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=your-db \
  remote-devtools
```

### PM2

```bash
pnpm start:container
```

### Nginx 리버스 프록시 예시

```nginx
upstream internal_server {
    server 127.0.0.1:3000;
}

upstream external_server {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name debug.example.com;

    location / {
        proxy_pass http://internal_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

server {
    listen 80;
    server_name api.debug.example.com;

    location / {
        proxy_pass http://external_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

WebSocket 연결을 사용하므로 `Upgrade` 헤더 설정이 필수다.

---

## 문제 해결

### WebSocket 연결 실패

- 서버가 실행 중인지 확인
- 방화벽/프록시에서 WebSocket이 허용되어 있는지 확인
- `CORS_ALLOWED_ORIGINS`에 클라이언트 도메인이 포함되어 있는지 확인

### DB 연결 실패

- `docker-compose ps`로 PostgreSQL 컨테이너 상태 확인
- `.env.local`의 DB 연결 정보가 정확한지 확인
- 포트 5432가 다른 프로세스에 점유되어 있지 않은지 확인

### SDK 로드 실패 (`RemoteDebugSdk is not defined`)

- External 서버(3001)가 실행 중인지 확인
- 스크립트 URL이 올바른지 확인
- 브라우저 개발자 도구의 Network 탭에서 SDK 파일 로딩 상태 확인
