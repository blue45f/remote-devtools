# Remote Debug Tools 사용자 매뉴얼

웹 애플리케이션을 위한 원격 디버깅 플랫폼입니다.
QA 엔지니어, 개발자, PM을 위한 실사용 가이드입니다.

---

## 목차

- [환경별 설정 가이드](#환경별-설정-가이드)
- [시작하기 전에](#시작하기-전에)
- [1. 라이브 디버깅](#1-라이브-디버깅)
- [2. 세션 녹화](#2-세션-녹화)
- [3. 세션 재생](#3-세션-재생)
- [4. SDK 연동](#4-sdk-연동)
- [5. Jira 티켓 생성](#5-jira-티켓-생성)
- [6. Figma 플러그인](#6-figma-플러그인)
- [7. 대시보드](#7-대시보드)
- [자주 묻는 질문](#자주-묻는-질문)

---

## 환경별 설정 가이드

Remote Debug Tools는 **로컬 개발**, **개발 서버**, **프로덕션** 세 가지 환경을 지원합니다.

### 환경 비교

| 항목 | 로컬 개발 | 개발 서버 (Beta) | 프로덕션 |
|------|----------|-----------------|---------|
| `APP_ENV` | `development` | `beta` | `production` |
| DB 자동 동기화 | 활성화 (synchronize: true) | 비활성화 | 비활성화 |
| DB 호스트 | `localhost` | 내부 DB 주소 | RDS 등 관리형 DB |
| CORS | localhost 자동 허용 | `CORS_ALLOWED_ORIGINS` 설정 필요 | `CORS_ALLOWED_ORIGINS` 설정 필요 |
| SDK 서버 주소 | `http://localhost:3001` | 빌드 시 `VITE_EXTERNAL_HOST` 지정 | 빌드 시 `VITE_EXTERNAL_HOST` 지정 |
| Jira/Slack | 선택 (없어도 동작) | 설정 권장 | 필수 |
| 사용자 등록 | SQL 직접 등록 | API 또는 관리자 페이지 | 관리자 페이지 |
| 실행 방법 | `pnpm start:*:dev` | Docker Compose | Docker + PM2 |

### 로컬 개발 환경 설정

#### 1단계: 서비스 시작

```bash
pnpm install
pnpm compose                    # DB + 서버 한번에 시작

# 또는 개별 실행
docker-compose up postgres -d   # DB만 시작
pnpm start:internal:dev         # Internal 서버 (3000)
pnpm start:external:dev         # External 서버 (3001)
cd client && pnpm dev           # 클라이언트 (8080)
```

#### 2단계: 환경변수 설정

```bash
cp .env.example apps/remote-platform-external/src/.env.local
cp .env.example apps/remote-platform-internal/src/.env.local
```

기본값으로 DB 연결과 서버 실행이 가능합니다. Jira/Slack은 선택사항입니다.

#### 3단계: 사용자 및 Jira 설정 (티켓 생성 기능 사용 시)

로컬에서는 Workflow API(Slack 조회)가 없으므로 SQL로 직접 등록합니다:

```bash
PGPASSWORD=mypassword psql -h localhost -U myuser -d mydb << 'SQL'
-- 사용자 생성
INSERT INTO users (name, username, job_type, slack_id, emp_no, created_at, updated_at)
VALUES ('홍길동', 'gildong.hong', 'QA', 'local-dev', '00000001', NOW(), NOW());

-- 디바이스 등록 (SDK fallback deviceId 2개)
INSERT INTO device_info_list (user_id, device_id, device_name, created_at, updated_at)
SELECT id, 'unknown-device', 'Local Browser', NOW(), NOW()
FROM users WHERE emp_no = '00000001';

INSERT INTO device_info_list (user_id, device_id, device_name, created_at, updated_at)
SELECT id, 'OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1', 'SDK Fallback', NOW(), NOW()
FROM users WHERE emp_no = '00000001';

-- 티켓 템플릿 (jira_project_key를 실제 값으로 변경)
INSERT INTO ticket_template_list
  (user_id, name, jira_project_key, title_prefix, assignee_info_list, component_list, label_list, created_at, updated_at)
SELECT id, '기본 템플릿', 'YOUR_PROJECT_KEY', '[QA] ',
  '[]'::jsonb, '[]'::jsonb, '["QA"]'::jsonb, NOW(), NOW()
FROM users WHERE emp_no = '00000001';
SQL
```

> **왜 deviceId가 2개인가?** SDK는 `commonInfo`가 없는 브라우저 환경에서 상황별로 다른 fallback ID를 사용합니다:
> - WebSocket 연결 시: `unknown-device`
> - 티켓 모달 API 호출 시: `OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1`

#### 4단계: Jira 환경변수 설정 (선택)

`.env.local`에 Jira 인증 정보를 추가합니다:

```bash
JIRA_HOST_URL=https://your-domain.atlassian.net
JIRA_API_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

API 토큰 발급: https://id.atlassian.com/manage-profile/security/api-tokens

`jiraProjectKey`는 Jira 보드 URL에서 확인합니다:
`https://your-domain.atlassian.net/jira/software/projects/{KEY}/board`

#### 5단계: 설정 확인

```bash
# 서버 상태
curl http://localhost:3000/health   # Internal → "ok"
curl http://localhost:3001/health   # External → "ok"

# 티켓 템플릿 로드 (SDK가 호출하는 API)
curl "http://localhost:3000/api/user-templates?deviceId=OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1"
# → {"success": true, "data": {"ticketTemplateList": [...]}} 면 정상

# Jira 인증 확인 (선택)
curl -u "email:api-token" "https://your-domain.atlassian.net/rest/api/3/myself"
```

#### 접속 URL

| URL | 설명 |
|-----|------|
| `http://localhost:8080` | 클라이언트 (테스트 페이지, SDK 포함) |
| `http://localhost:3000` | Internal 서버 (DevTools UI, API) |
| `http://localhost:3001` | External 서버 (SDK 서빙, WebSocket) |
| `http://localhost:5050` | PgAdmin (DB 관리, admin@example.com / admin) |
| `http://localhost:3002` | DevTools 핫 리로드 (`pnpm devtools:dev`) |

### 개발 서버 (Beta) 환경

#### 환경변수

```bash
APP_ENV=beta
DB_WRITER_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
CORS_ALLOWED_ORIGINS=dev.example.com,staging.example.com
JIRA_HOST_URL=https://your-domain.atlassian.net
JIRA_API_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
WORKFLOW_API_URL=https://workflow.example.com
EXTERNAL_HOST=https://api-dev.example.com
INTERNAL_HOST=https://debug-dev.example.com
```

#### SDK 빌드

개발 서버 주소를 지정하여 SDK를 빌드합니다:

```bash
cd sdk
VITE_INTERNAL_HOST=https://debug-dev.example.com \
VITE_EXTERNAL_HOST=https://api-dev.example.com \
VITE_INTERNAL_WS=wss://debug-dev.example.com \
VITE_EXTERNAL_WS=wss://api-dev.example.com \
pnpm build
```

#### 사용자 등록

개발 서버에서는 REST API로 사용자를 등록합니다:

```bash
curl -X PUT "https://debug-dev.example.com/api/user-profile/{empNo}/upsert" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "홍길동",
    "username": "gildong.hong",
    "jobType": "QA",
    "empNo": "00000001",
    "email": "user@company.com",
    "deviceInfoList": [
      { "deviceId": "device-uuid-from-app", "deviceName": "iPhone 15" }
    ],
    "ticketTemplateList": [{
      "name": "프로젝트A",
      "jiraProjectKey": "PROJA",
      "titlePrefix": "[QA] ",
      "componentList": ["Frontend"],
      "labelList": ["QA"]
    }]
  }'
```

### 프로덕션 환경

#### 실행

```bash
# Docker
docker build -t remote-devtools .
docker run -d -p 3000:3000 -p 3001:3001 \
  -e APP_ENV=production \
  -e DB_WRITER_HOST=your-rds-host \
  -e DB_USER=your-user \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=your-db \
  -e CORS_ALLOWED_ORIGINS=app.example.com \
  -e JIRA_HOST_URL=https://your-domain.atlassian.net \
  -e JIRA_API_EMAIL=your-email@example.com \
  -e JIRA_API_TOKEN=your-api-token \
  remote-devtools

# 또는 PM2
pnpm start:container
```

#### SDK 배포

프로덕션 SDK를 빌드하고 External 서버의 `sdk/dist/`에 배포합니다:

```bash
cd sdk
VITE_INTERNAL_HOST=https://debug.example.com \
VITE_EXTERNAL_HOST=https://api.debug.example.com \
VITE_INTERNAL_WS=wss://debug.example.com \
VITE_EXTERNAL_WS=wss://api.debug.example.com \
pnpm build
```

#### 필수 환경변수 체크리스트

| 변수 | 필수 | 설명 |
|------|------|------|
| `APP_ENV` | O | `production` |
| `DB_WRITER_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | O | PostgreSQL 연결 |
| `CORS_ALLOWED_ORIGINS` | O | SDK가 삽입된 도메인 |
| `JIRA_HOST_URL`, `JIRA_API_EMAIL`, `JIRA_API_TOKEN` | O | Jira 연동 |
| `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` | 권장 | Slack 알림 |
| `AWS_REGION`, `AWS_S3_BUCKET` | 권장 | 세션 백업 |
| `EXTERNAL_HOST`, `INTERNAL_HOST` | O | 서버 간 통신, 링크 생성 |
| `WORKFLOW_API_URL` | 선택 | 사용자 등록 시 Slack 조회 |

---

## 시작하기 전에

### 접속 URL

| 서비스 | URL | 용도 |
|--------|-----|------|
| 웹 클라이언트 | `http://localhost:8080` | 테스트 페이지, 세션 목록 |
| 세션 목록 | `http://localhost:8080/rooms` | 녹화된 세션 조회 |
| DevTools UI | `http://localhost:3000/tabbed-debug/?ws=...` | 디버깅 화면 |
| PgAdmin | `http://localhost:5050` | DB 관리 (admin@example.com / admin) |

### 동작 구조 요약

```
대상 웹 앱 (SDK 포함)  --->  External 서버 (:3001)  --->  DB 저장
                                                     --->  Internal 서버 (:3000)  --->  DevTools UI
```

SDK가 삽입된 웹 앱에서 디버깅 데이터(네트워크, 콘솔, DOM, 화면)를 수집하고,
DevTools UI에서 실시간 확인하거나 녹화 후 재생할 수 있습니다.

---

## 1. 라이브 디버깅

실시간으로 원격 웹 앱을 디버깅합니다.

### 사용 방법

1. SDK가 삽입된 웹 앱을 브라우저에서 엽니다.
2. 화면 우하단 플로팅 버튼을 클릭합니다.
3. "녹화 시작" 버튼을 클릭하면 Room이 생성됩니다.
4. 표시되는 DevTools URL을 복사하여 브라우저에서 엽니다.

   ```
   http://localhost:3000/tabbed-debug/?ws=localhost:3000&roomName=abc123&type=live
   ```

5. DevTools UI에서 실시간 데이터를 확인합니다.

### DevTools 패널별 기능

| 패널 | 확인 가능한 정보 |
|------|-----------------|
| Network | HTTP 요청/응답, 상태 코드, 헤더, 본문 |
| Console | console.log, warn, error 등 모든 로그 |
| Elements | 실시간 DOM 트리, CSS 스타일 |
| Session Replay | 화면 녹화 재생 (rrweb 기반) |

### 활용 예시

- QA 테스트 중 API 응답 확인
- 모바일 기기 웹뷰에서 발생하는 에러 로그 실시간 확인
- 원격 사용자의 화면 상태 모니터링

---

## 2. 세션 녹화

디버깅 세션을 녹화하여 저장합니다.

### 녹화 시작

1. SDK가 삽입된 웹 앱에서 플로팅 버튼을 클릭합니다.
2. "녹화 시작"을 선택합니다.
3. 화면 상단에 녹화 상태 토스트가 표시됩니다.

   ```
   녹화 중 | Room: abc123 | [URL 복사] [종료]
   ```

4. 테스트를 진행합니다. 이 동안 다음 데이터가 자동 수집됩니다:
   - 모든 네트워크 요청/응답
   - 콘솔 로그 및 에러
   - DOM 변경 이력
   - 화면 스크린샷

5. "종료" 버튼을 클릭하면 녹화가 저장됩니다.

### 녹화 데이터 확인

1. `http://localhost:8080/rooms`에 접속합니다.
2. 녹화 세션 목록에서 원하는 세션을 선택합니다.
3. DevTools URL을 클릭하면 저장된 데이터를 DevTools UI에서 확인할 수 있습니다.

### 버퍼링

SDK는 페이지 로드 시점부터 데이터를 버퍼에 저장합니다.
녹화 시작 전에 발생한 네트워크 요청과 콘솔 로그도 포함됩니다.

---

## 3. 세션 재생

녹화된 세션을 프레임 단위로 재생합니다.

### 재생 방법

1. 세션 목록(`http://localhost:8080/rooms`)에서 녹화 세션을 선택합니다.
2. DevTools URL을 클릭합니다.

   ```
   http://localhost:3000/tabbed-debug/?ws=localhost:3000&roomName=abc123&type=record
   ```

3. DevTools UI가 열리면 각 패널에서 녹화된 데이터를 확인합니다:
   - **Network 패널**: 녹화 시점의 모든 HTTP 요청/응답
   - **Console 패널**: 녹화 시점의 콘솔 로그
   - **Elements 패널**: 녹화 시점의 DOM 스냅샷
   - **Session Replay 패널**: 화면 녹화를 타임라인으로 재생

### Session Replay 패널 사용

- 재생/일시정지 버튼으로 녹화를 제어합니다.
- 타임라인을 드래그하여 특정 시점으로 이동합니다.
- 마우스 움직임, 클릭, 스크롤, 입력 등 사용자 동작이 재현됩니다.

### 활용 예시

- 버그 재현: QA가 녹화한 세션을 개발자가 재생하여 문제 분석
- 팀 공유: 녹화 URL을 공유하여 같은 상황을 팀원 모두가 확인
- 이슈 보고: Jira 티켓에 녹화 링크를 첨부

---

## 4. SDK 연동

웹 앱에 SDK를 삽입하면 디버깅 기능을 사용할 수 있습니다.

### 기본 설치

HTML 페이지에 스크립트 한 줄을 추가합니다:

```html
<script src="http://localhost:3001/sdk/index.umd.js"></script>
```

SDK가 로드되면 자동으로 초기화되며, 화면 우하단에 플로팅 버튼이 나타납니다.

### 수동 초기화

자동 초기화 대신 직접 제어하려면:

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

### React 프로젝트에서 사용

```tsx
import Script from 'next/script';

export default function App() {
  const handleSdkLoad = () => {
    if (window.RemoteDebugSdk) {
      window.RemoteDebugSdk.createDebugger();
    }
  };

  return (
    <Script
      src="http://localhost:3001/sdk/index.umd.js"
      strategy="beforeInteractive"
      onLoad={handleSdkLoad}
    />
  );
}
```

### 플로팅 버튼 기능

SDK가 로드되면 다음 기능을 가진 플로팅 버튼이 표시됩니다:

| 버튼 | 기능 |
|------|------|
| 녹화 시작 | 현재 세션을 녹화하여 서버에 저장 |
| QA 티켓 만들기 | Jira 티켓 생성 모달 열기 |
| Network Rewrite | API 응답 모킹 설정 |

### Network Rewrite

특정 API 응답을 모킹하여 다양한 시나리오를 테스트할 수 있습니다:

1. 플로팅 버튼에서 "Network Rewrite"를 클릭합니다.
2. 모킹할 URL 패턴을 입력합니다.
3. 원하는 상태 코드와 응답 본문을 설정합니다.
4. 저장하면 해당 API 호출 시 설정한 응답이 반환됩니다.

활용 예시:
- 에러 상태 코드(500, 404) 응답을 시뮬레이션하여 에러 처리 검증
- 특정 데이터 구조 응답을 모킹하여 UI 표시 테스트

---

## 5. Jira 티켓 생성

디버깅 세션에서 직접 Jira 티켓을 생성합니다.

### SDK에서 티켓 생성

1. 웹 앱에서 플로팅 버튼을 클릭합니다.
2. "QA 티켓 만들기"를 선택합니다.
3. 티켓 생성 모달이 열립니다.
4. 다음 정보를 입력합니다:
   - 제목
   - 설명
   - 우선순위
   - 담당자
   - 첨부 이미지 (선택)
5. "생성" 버튼을 클릭합니다.

### 자동 포함 정보

티켓에는 다음 정보가 자동으로 포함됩니다:

- 디바이스 정보 (모델, OS 버전)
- 현재 페이지 URL
- 녹화 세션 링크 (녹화 중인 경우)
- 화면 스크린샷
- 브라우저/앱 환경 정보

### 필요 설정

Jira 티켓 생성을 위해 **두 가지 설정**이 필요합니다.

#### 1. 서버 환경변수 (`.env.local`)

```
JIRA_HOST_URL=https://your-domain.atlassian.net
JIRA_API_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

API 토큰 발급: https://id.atlassian.com/manage-profile/security/api-tokens

#### 2. DB 사용자 프로필 등록

SDK가 티켓을 생성하려면 DB에 사용자, 디바이스, 티켓 템플릿이 등록되어 있어야 합니다.

| 필수 데이터 | 설명 |
|------------|------|
| `users` | 사용자 정보 (이름, 사번, 직무) |
| `device_info_list` | 디바이스-사용자 매핑 (SDK가 deviceId로 사용자를 식별) |
| `ticket_template_list` | 티켓 템플릿 (`jiraProjectKey` 필수) |

**로컬 개발 환경**에서는 SQL로 직접 등록합니다:

```bash
PGPASSWORD=mypassword psql -h localhost -U myuser -d mydb << 'SQL'
-- 사용자
INSERT INTO users (name, username, job_type, slack_id, emp_no, created_at, updated_at)
VALUES ('홍길동', 'gildong.hong', 'QA', 'local-dev', '00000001', NOW(), NOW());

-- 디바이스 (SDK fallback deviceId 2개 모두 등록)
INSERT INTO device_info_list (user_id, device_id, device_name, created_at, updated_at)
SELECT id, 'unknown-device', 'Local Browser', NOW(), NOW() FROM users WHERE emp_no = '00000001';
INSERT INTO device_info_list (user_id, device_id, device_name, created_at, updated_at)
SELECT id, 'OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1', 'SDK Fallback', NOW(), NOW() FROM users WHERE emp_no = '00000001';

-- 티켓 템플릿 (jiraProjectKey를 실제 프로젝트 키로 변경)
INSERT INTO ticket_template_list (user_id, name, jira_project_key, title_prefix, assignee_info_list, component_list, label_list, created_at, updated_at)
SELECT id, '기본 템플릿', 'YOUR_PROJECT_KEY', '[QA] ', '[]'::jsonb, '[]'::jsonb, '["QA"]'::jsonb, NOW(), NOW()
FROM users WHERE emp_no = '00000001';
SQL
```

**프로덕션 환경**에서는 관리자 페이지(Client 앱)의 사용자 프로필 API를 통해 등록합니다.

#### jiraProjectKey 확인 방법

Jira 보드 URL에서 프로젝트 키를 확인합니다:
`https://your-domain.atlassian.net/jira/software/projects/{KEY}/board` → `{KEY}` 부분이 프로젝트 키입니다.

#### 설정 확인

```bash
# 티켓 템플릿 로드 확인
curl "http://localhost:3000/api/user-templates?deviceId=OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1"
# {"success": true, "data": {"ticketTemplateList": [...]}} 이 나오면 정상
```

---

## 6. Figma 플러그인

디자이너가 Figma에서 직접 디버깅 세션을 조회하고 티켓을 생성할 수 있습니다.

### 설치

1. Figma Desktop 또는 웹 앱을 엽니다.
2. 메뉴에서 플러그인 > 개발 > 매니페스트에서 플러그인 가져오기를 선택합니다.
3. `figma-plugin/manifest.json` 파일을 선택합니다.

### 주요 기능

**디바이스 목록 조회**
- SDK가 연결된 디바이스 목록을 실시간으로 확인합니다.
- 디바이스 모델, OS, 접속 URL 정보를 볼 수 있습니다.

**녹화 세션 조회**
- 각 디바이스의 녹화 세션 목록을 확인합니다.
- 스크린 프리뷰 이미지를 볼 수 있습니다.
- DevTools 링크를 클릭하면 세션을 재생할 수 있습니다.

**Jira 티켓 생성**
- 디바이스 또는 세션을 선택하고 "티켓 만들기"를 클릭합니다.
- 템플릿을 선택하고 정보를 입력합니다.
- 녹화 세션 링크와 디바이스 정보가 자동 포함됩니다.

### 사용 순서

1. Figma에서 플러그인을 실행합니다 (`Cmd/Ctrl + /` > "Remote Debug Tools").
2. 디바이스 목록에서 대상 디바이스를 선택합니다.
3. 세션 목록에서 녹화를 확인하거나, 티켓을 생성합니다.

---

## 7. 대시보드

프로젝트의 디버깅 활동 현황을 한눈에 파악합니다.

### 접속

웹 클라이언트(`http://localhost:8080`)에서 대시보드 메뉴를 선택합니다.

### 제공 정보

| 항목 | 설명 |
|------|------|
| 통계 요약 | 전체 세션 수, 티켓 수, 활성 디바이스 수 |
| 티켓 트렌드 | 기간별 티켓 생성 추이 |
| Room 트렌드 | 기간별 녹화 세션 추이 |

### 기간 필터

- 조회 기간을 지정하여 원하는 범위의 통계를 확인할 수 있습니다.
- 일별, 주별, 월별 단위로 트렌드를 비교합니다.

---

## 자주 묻는 질문

### SDK 관련

**Q: SDK 스크립트가 로드되지 않습니다.**

A: External 서버(포트 3001)가 실행 중인지 확인하세요. CORS 설정에 현재 도메인이 포함되어 있는지도 확인하세요.

**Q: 플로팅 버튼이 보이지 않습니다.**

A: 브라우저 콘솔에서 `window.RemoteDebugSdk`를 입력하여 SDK 로드 여부를 확인하세요. `undefined`로 나오면 스크립트 URL이 올바른지 점검하세요.

**Q: 네트워크 요청이 일부만 캡처됩니다.**

A: SDK를 가능한 빨리 로드하세요. `<head>` 태그에 스크립트를 배치하면 초기 요청도 캡처할 수 있습니다. 버퍼링 모드가 활성화되어 있으면 로드 전 요청도 일부 포함됩니다.

### 녹화/재생 관련

**Q: 녹화 데이터가 저장되지 않습니다.**

A: DB 연결 상태를 확인하세요. Docker Compose가 정상 실행 중인지 `docker-compose ps`로 확인합니다.

**Q: 세션 재생 시 화면이 표시되지 않습니다.**

A: 녹화 시간이 너무 짧거나 DOM이 복잡한 경우 문제가 발생할 수 있습니다. 페이지를 새로고침하고 다시 시도하세요.

### Jira / 티켓 관련

**Q: "Could not load ticket template data. Check your server connection." 에러가 나옵니다.**

A: DB에 사용자 프로필이 등록되지 않은 것입니다. [환경별 설정 가이드](#로컬-개발-환경-설정)의 3단계를 참고하여 사용자, 디바이스, 티켓 템플릿을 DB에 등록하세요. 특히 SDK 티켓 모달이 사용하는 fallback deviceId(`OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1`)가 등록되어 있어야 합니다.

확인 방법:
```bash
curl "http://localhost:3000/api/user-templates?deviceId=OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1"
```

**Q: "Jira project key is not configured" 에러가 나옵니다.**

A: 티켓 템플릿의 `jiraProjectKey`가 비어 있습니다. DB에서 확인하세요:
```bash
PGPASSWORD=mypassword psql -h localhost -U myuser -d mydb \
  -c "SELECT name, jira_project_key FROM ticket_template_list;"
```

**Q: 티켓 생성이 실패합니다.**

A: 다음을 순서대로 확인하세요:
1. Jira 환경변수(JIRA_HOST_URL, JIRA_API_EMAIL, JIRA_API_TOKEN)가 `.env.local`에 설정되어 있는지
2. API 토큰이 유효한지: `curl -u "email:token" "https://your-domain.atlassian.net/rest/api/3/myself"`
3. DB에 사용자의 `jiraProjectKey`가 올바른 프로젝트 키인지
4. 해당 프로젝트에 "버그" 이슈 타입이 존재하는지

**Q: jiraProjectKey를 어디서 확인하나요?**

A: Jira 보드 URL에서 확인합니다: `https://your-domain.atlassian.net/jira/software/projects/{KEY}/board` → `{KEY}`가 프로젝트 키입니다. 또는 REST API로 조회: `curl -u "email:token" "https://your-domain.atlassian.net/rest/api/3/project"`

### 연결 관련

**Q: WebSocket 연결이 자꾸 끊어집니다.**

A: 네트워크 환경을 확인하세요. 프록시나 방화벽이 WebSocket 연결을 차단하고 있을 수 있습니다. 서버 로그는 `docker-compose logs -f`로 확인할 수 있습니다.

### 환경 설정 관련

**Q: 로컬에서 SDK 플로팅 버튼은 보이는데 티켓 생성이 안 됩니다.**

A: SDK 플로팅 버튼은 External 서버(3001)만 있으면 동작하지만, 티켓 생성은 Internal 서버(3000)의 API를 호출합니다. 두 서버가 모두 실행 중인지, DB에 사용자 데이터가 등록되어 있는지 확인하세요.

**Q: 프로덕션에서 SDK가 서버에 연결되지 않습니다.**

A: SDK 빌드 시 `VITE_EXTERNAL_HOST`와 `VITE_INTERNAL_HOST`를 프로덕션 서버 주소로 지정했는지 확인하세요. 또한 서버의 `CORS_ALLOWED_ORIGINS`에 SDK가 삽입된 웹 앱의 도메인이 포함되어 있어야 합니다.
