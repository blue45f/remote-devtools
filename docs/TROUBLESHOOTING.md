# 문제 해결 가이드

Remote Debug Tools 사용 중 자주 발생하는 문제와 해결 방법을 정리한 문서이다.

---

## 설치 관련

### Node.js 버전 오류

```
error: The engine "node" is incompatible with this module
```

Node.js 20 이상이 필요하다.

```bash
node --version
nvm install 20 && nvm use 20
```

### pnpm 의존성 설치 실패

```
ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies
```

캐시 및 node_modules를 삭제하고 재설치한다.

```bash
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Docker 연결 실패

```
ERROR: Couldn't connect to Docker daemon
```

Docker Desktop이 실행 중인지 확인한다.

```bash
# macOS
open -a Docker

# Linux
sudo systemctl restart docker
```

---

## 서버 관련

### 포트 충돌 (EADDRINUSE)

```
Error: listen EADDRINUSE: address already in use :::3000
```

internal은 포트 3000, external은 포트 3001을 사용한다. 해당 포트를 점유 중인 프로세스를 종료한다.

```bash
lsof -i :3000
kill -9 <PID>
```

### 모듈을 찾을 수 없음

```
Error: Cannot find module '@remote-platform/entity'
```

라이브러리 빌드가 필요하거나 심링크가 깨진 경우이다.

```bash
pnpm install
pnpm build:all
```

### 환경변수 로드 실패

```
Error: DB_WRITER_HOST is not defined
```

`.env.local` 파일이 각 앱의 `src/` 디렉토리에 존재하는지 확인한다.

```bash
cp .env.example apps/remote-platform-internal/src/.env.local
cp .env.example apps/remote-platform-external/src/.env.local
```

---

## 데이터베이스 관련

### PostgreSQL 연결 실패

```
Error: Connection refused to PostgreSQL
```

Docker 컨테이너 상태를 확인한다.

```bash
docker-compose ps
# postgres 컨테이너가 Up 상태인지 확인

# 포트 충돌 확인
lsof -i :5432
```

### 테이블이 존재하지 않음

```
QueryFailedError: relation "record" does not exist
```

개발 환경에서는 TypeORM synchronize 옵션을 활성화한다. 프로덕션에서는 마이그레이션을 사용한다.

```bash
pnpm typeorm migration:run
```

---

## WebSocket 관련

### 연결 끊김

```
WebSocket connection closed unexpectedly
```

주요 원인:

1. 프록시/로드밸런서의 WebSocket 타임아웃 설정이 너무 짧은 경우
   ```nginx
   proxy_read_timeout 86400s;
   proxy_send_timeout 86400s;
   ```
2. 네트워크 불안정으로 인한 연결 끊김 (SDK 자동 재연결 로직 확인)
3. 서버 재시작 (클라이언트에서 재연결 처리 필요)

### 메시지 손실

일부 CDP 메시지가 전달되지 않는 경우, WebSocket 버퍼 오버플로우를 의심한다.

```javascript
// 버퍼 상태 확인
console.log(ws.bufferedAmount);
```

---

## SDK 관련

### SDK 로드 실패

```
RemoteDebugSdk is not defined
```

1. external 서버(포트 3001)가 실행 중인지 확인: `curl http://localhost:3001/health`
2. SDK URL이 올바른지 확인
3. CORS 오류가 발생하면 `.env.local`에서 `CORS_ALLOWED_ORIGINS` 설정

### 네트워크 요청 캡처 안 됨

- SDK를 가능한 한 빨리 로드한다 (`<head>` 태그 내 상단)
- Service Worker가 요청을 가로채는 경우 간섭이 발생할 수 있다
- `window.fetch.toString()`이 `[native code]`가 아니면 다른 라이브러리가 먼저 패치한 것이다

### 티켓 생성 시 "Could not load ticket template data"

SDK에서 "QA 티켓 만들기"를 클릭했을 때 이 에러가 발생하면 DB에 사용자 설정이 없는 것이다.

**원인**: SDK 티켓 모달은 Internal 서버(3000)에서 사용자의 티켓 템플릿을 조회한다. DB에 해당 deviceId로 연결된 사용자와 템플릿이 없으면 실패한다.

**확인 방법**:

```bash
# SDK 티켓 모달이 사용하는 fallback deviceId로 조회
curl "http://localhost:3000/api/user-templates?deviceId=OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1"
```

`"Device not found"` 에러가 나오면 사용자 등록이 필요하다.

**해결 방법**: [설치 가이드의 "사용자 프로필 및 Jira 설정"](INSTALLATION.md#6-사용자-프로필-및-jira-설정-로컬-개발)을 참고하여 DB에 사용자, 디바이스, 티켓 템플릿을 등록한다.

**주의**: SDK는 commonInfo가 없는 브라우저 환경에서 두 가지 fallback deviceId를 사용한다:
- 일반 WebSocket 연결: `unknown-device`
- 티켓 모달 API 호출: `OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1`

두 deviceId 모두 DB에 등록해야 한다.

### 티켓 생성 시 "Jira project key is not configured"

티켓 템플릿에 `jiraProjectKey`가 설정되지 않았다. DB의 `ticket_template_list` 테이블에서 해당 사용자의 템플릿에 `jira_project_key` 값을 확인한다.

```bash
PGPASSWORD=mypassword psql -h localhost -U myuser -d mydb \
  -c "SELECT name, jira_project_key FROM ticket_template_list;"
```

### 티켓 생성 시 "User registration is required"

디바이스는 등록되어 있지만 사용자 정보가 불완전한 경우이다. 관리자에게 사용자 등록을 요청하거나 SQL로 직접 등록한다.

---

## 외부 서비스 연동

### Jira 연동 실패

```
Error: JIRA_ERROR - Authentication failed
```

- API 토큰을 재발급한다: https://id.atlassian.com/manage-profile/security/api-tokens
- 프로젝트 및 이슈 생성 권한을 확인한다

### Slack 연동 실패

```
Error: SLACK_ERROR - channel_not_found
```

- 채널 ID 형식 확인 (예: `C01234567`)
- Bot에 `chat:write` 권한이 있는지 확인
- 채널에 Bot이 초대되어 있는지 확인

### Google Sheets 연동 실패

```
Error: The caller does not have permission
```

- 스프레드시트에 서비스 계정 이메일을 공유한다
- Google Cloud Console에서 Sheets API가 활성화되어 있는지 확인한다

---

## 성능 관련

### 서버 메모리 사용량 증가

1. 버퍼 정리 로직이 정상 동작하는지 확인
2. Node.js 메모리 프로파일링: `node --inspect dist/main.js`

### API 응답 지연

1. 데이터베이스 인덱스 추가 검토
2. 프로덕션 환경에서 로그 레벨을 `warn` 이상으로 설정: `LOG_LEVEL=warn`

---

## 로그 확인

```bash
# Docker Compose 로그
docker-compose logs -f

# 특정 서비스만
docker-compose logs -f internal
docker-compose logs -f external

# PM2 로그
pm2 logs
```

---

## 추가 지원

문제가 해결되지 않으면 GitHub Issues에 다음 정보를 포함하여 제출한다:

- 운영체제 및 버전
- Node.js 버전 (`node --version`)
- 에러 메시지 전문
- 재현 단계
