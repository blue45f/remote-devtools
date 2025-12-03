# 🔧 문제 해결 가이드

이 문서는 Remote Debug Tools 사용 중 발생할 수 있는 문제와 해결 방법을 안내합니다.

## 목차

- [설치 관련 문제](#설치-관련-문제)
- [서버 관련 문제](#서버-관련-문제)
- [SDK 관련 문제](#sdk-관련-문제)
- [데이터베이스 문제](#데이터베이스-문제)
- [WebSocket 문제](#websocket-문제)
- [세션 리플레이 문제](#세션-리플레이-문제)
- [외부 서비스 연동 문제](#외부-서비스-연동-문제)
- [성능 문제](#성능-문제)

---

## 설치 관련 문제

### Node.js 버전 오류

**증상**
```
error: The engine "node" is incompatible with this module
```

**원인**: Node.js 버전이 요구사항(>=20)을 충족하지 않음

**해결 방법**
```bash
# 현재 버전 확인
node --version

# nvm으로 버전 변경
nvm install 20
nvm use 20

# 또는 volta 사용
volta install node@20
```

---

### pnpm 설치 오류

**증상**
```
ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies
```

**해결 방법**
```bash
# pnpm 캐시 삭제
pnpm store prune

# node_modules 삭제 후 재설치
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

### Docker Compose 실패

**증상**
```
ERROR: Couldn't connect to Docker daemon
```

**해결 방법**
1. Docker Desktop이 실행 중인지 확인
2. Docker 서비스 재시작
```bash
# macOS
open -a Docker

# Linux
sudo systemctl restart docker
```

---

## 서버 관련 문제

### 서버 시작 실패

**증상**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**원인**: 포트가 이미 사용 중

**해결 방법**
```bash
# 사용 중인 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>

# 또는 다른 포트 사용
PORT=3002 pnpm start:internal:dev
```

---

### 모듈을 찾을 수 없음

**증상**
```
Error: Cannot find module '@remote-platform/entity'
```

**해결 방법**
```bash
# TypeScript 빌드
pnpm build:internal
pnpm build:external

# 또는 심링크 재생성
pnpm install
```

---

### 환경변수 로드 실패

**증상**
```
Error: DB_HOST is not defined
```

**해결 방법**
1. `.env.local` 파일 존재 확인
```bash
ls -la apps/remote-platform-internal/src/.env.local
```

2. 환경변수 파일 생성
```bash
cp .env.example apps/remote-platform-internal/src/.env.local
```

3. dotenv 로드 확인
```typescript
// main.ts에서 dotenv 로드 확인
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
```

---

## SDK 관련 문제

### SDK 로드 실패

**증상**
```
RemoteDebugSdk is not defined
```

**원인**: SDK 스크립트 로드 실패

**해결 방법**

1. 서버 실행 확인
```bash
curl http://localhost:3001/health
```

2. SDK URL 확인
```html
<!-- 올바른 URL -->
<script src="http://localhost:3001/sdk/index.umd.js"></script>
```

3. CORS 오류 확인 (브라우저 콘솔)
```
Access to script at '...' from origin '...' has been blocked by CORS
```

4. CORS 설정 추가
```bash
# .env.local
CORS_ALLOWED_ORIGINS=your-domain.com
```

---

### 네트워크 요청 캡처 안 됨

**증상**: 일부 또는 모든 네트워크 요청이 DevTools에 표시되지 않음

**원인 및 해결**

1. **SDK 로드 순서**
   - SDK를 가능한 빨리 로드
   ```html
   <head>
     <script src="http://localhost:3001/sdk/index.umd.js"></script>
   </head>
   ```

2. **Service Worker 간섭**
   - Service Worker가 요청을 가로채는 경우
   ```javascript
   // Service Worker 비활성화 테스트
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(r => r.unregister());
   });
   ```

3. **Fetch/XHR 패치 확인**
   ```javascript
   // 콘솔에서 확인
   console.log(window.fetch.toString());
   // "[native code]"가 아니면 패치됨
   ```

---

### 콘솔 로그 누락

**증상**: 일부 콘솔 로그가 캡처되지 않음

**해결 방법**

1. SDK 초기화 시점 확인
   - SDK가 로그 발생 전에 초기화되어야 함

2. 콘솔 훅 확인
```javascript
// 콘솔 함수가 패치되었는지 확인
console.log.__hooked // true여야 함
```

---

## 데이터베이스 문제

### 연결 실패

**증상**
```
Error: Connection refused to PostgreSQL
```

**해결 방법**

1. PostgreSQL 실행 확인
```bash
docker-compose ps
# postgres 컨테이너가 Up 상태인지 확인
```

2. 연결 정보 확인
```bash
# 직접 연결 테스트
docker-compose exec postgres psql -U myuser -d mydb
```

3. 포트 충돌 확인
```bash
lsof -i :5432
```

---

### 테이블 생성 실패

**증상**
```
QueryFailedError: relation "record" does not exist
```

**해결 방법**

TypeORM 동기화 활성화 (개발 환경에서만):
```typescript
// app.module.ts
TypeOrmModule.forRoot({
  ...
  synchronize: true, // 개발 환경에서만!
})
```

또는 마이그레이션 실행:
```bash
pnpm typeorm migration:run
```

---

### 데이터 용량 문제

**증상**: 데이터베이스 용량 급증

**해결 방법**

1. 오래된 레코드 정리
```sql
DELETE FROM record WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM network WHERE record_id NOT IN (SELECT id FROM record);
```

2. VACUUM 실행
```sql
VACUUM ANALYZE;
```

---

## WebSocket 문제

### 연결 끊김

**증상**
```
WebSocket connection closed unexpectedly
```

**원인 및 해결**

1. **타임아웃**
   - 프록시/로드밸런서의 WebSocket 타임아웃 확인
   - Nginx 설정:
   ```nginx
   proxy_read_timeout 86400s;
   proxy_send_timeout 86400s;
   ```

2. **네트워크 불안정**
   - SDK의 자동 재연결 기능 확인
   - 재연결 로직 확인

3. **서버 재시작**
   - 서버가 재시작되면 연결이 끊김
   - 클라이언트에서 재연결 처리 필요

---

### 메시지 손실

**증상**: 일부 CDP 메시지가 전달되지 않음

**해결 방법**

1. 메시지 크기 확인
```bash
# 큰 메시지는 분할 전송 필요
MAX_MESSAGE_SIZE=10MB
```

2. 버퍼 오버플로우 확인
```javascript
// WebSocket 버퍼 상태 확인
console.log(ws.bufferedAmount);
```

---

## 세션 리플레이 문제

### 리플레이 데이터 없음

**증상**: Session Replay 패널에 데이터가 표시되지 않음

**원인 및 해결**

1. **녹화 세션 확인**
   - 녹화 모드로 세션이 생성되었는지 확인
   - recordMode: true

2. **rrweb 이벤트 확인**
```javascript
// 이벤트가 수집되고 있는지 확인
console.log('rrweb events:', rrwebEvents.length);
```

3. **S3 백업 확인**
   - 페이지 이탈 시 백업이 저장되었는지 확인

---

### 리플레이 화면 깨짐

**증상**: 재생 시 레이아웃이 깨져 보임

**원인 및 해결**

1. **외부 리소스 로드 실패**
   - 이미지, 폰트 등 외부 리소스 접근 불가
   - CORS 설정 확인

2. **CSS 미적용**
   - 인라인 스타일 누락
   - 미디어 쿼리 문제

3. **동적 콘텐츠**
   - JavaScript로 생성된 콘텐츠 누락
   - MutationObserver 캡처 확인

---

## 외부 서비스 연동 문제

### Jira 연동 실패

**증상**
```
Error: JIRA_ERROR - Authentication failed
```

**해결 방법**

1. API 토큰 확인
   - https://id.atlassian.com/manage-profile/security/api-tokens
   - 토큰 재발급 시도

2. 권한 확인
   - 프로젝트 접근 권한 확인
   - 이슈 생성 권한 확인

3. 연결 테스트
```bash
curl -u "email@example.com:API_TOKEN" \
  "https://your-domain.atlassian.net/rest/api/3/myself"
```

---

### Slack 연동 실패

**증상**
```
Error: SLACK_ERROR - channel_not_found
```

**해결 방법**

1. 채널 ID 확인
   - 채널 우클릭 > 링크 복사 > URL에서 ID 추출
   - 형식: C01234567

2. Bot 권한 확인
   - `chat:write` 권한 필요
   - 채널에 Bot 초대 필요

3. 토큰 형식 확인
   - `xoxb-` 로 시작하는 Bot Token 사용

---

### Google Sheets 연동 실패

**증상**
```
Error: The caller does not have permission
```

**해결 방법**

1. 서비스 계정 권한 확인
   - 스프레드시트에 서비스 계정 이메일 공유

2. Private Key 형식 확인
   - JSON에서 복사 시 줄바꿈 `\n` 유지

3. API 활성화 확인
   - Google Cloud Console에서 Sheets API 활성화

---

## 성능 문제

### 메모리 사용량 증가

**증상**: 서버 메모리 사용량이 계속 증가

**해결 방법**

1. 버퍼 정리 확인
```javascript
// 주기적 버퍼 정리
setInterval(() => {
  bufferService.cleanup();
}, 60000);
```

2. 메모리 프로파일링
```bash
node --inspect dist/main.js
# Chrome DevTools에서 Memory 탭 분석
```

3. 힙 덤프 분석
```javascript
// 힙 덤프 생성
const v8 = require('v8');
v8.writeHeapSnapshot();
```

---

### 응답 지연

**증상**: API 응답이 느림

**해결 방법**

1. 데이터베이스 쿼리 최적화
```sql
-- 인덱스 추가
CREATE INDEX idx_record_device_id ON record(device_id);
CREATE INDEX idx_network_record_id ON network(record_id);
```

2. 캐싱 적용
```typescript
// Redis 캐싱 고려
@Cacheable({ ttl: 60 })
async getRecordList() { ... }
```

3. 로그 레벨 조정
```bash
# 프로덕션에서 debug 로그 비활성화
LOG_LEVEL=warn
```

---

## 로그 확인 방법

### 서버 로그

```bash
# Docker Compose 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f external
docker-compose logs -f internal

# PM2 로그
pm2 logs
```

### 클라이언트 로그

```javascript
// SDK 로그 레벨 설정
localStorage.setItem('REMOTE_DEBUG_LOG_LEVEL', 'debug');

// 로그 확인
// 브라우저 콘솔에서 [RemoteDebug-SDK] 로그 확인
```

---

## 추가 지원

문제가 해결되지 않으면:

1. **GitHub Issues**: 버그 리포트 제출
2. **GitHub Discussions**: 질문 및 토론
3. **로그 첨부**: 관련 로그와 재현 단계 포함

이슈 제출 시 포함할 정보:
- 운영체제 및 버전
- Node.js 버전
- 브라우저 및 버전
- 에러 메시지 전문
- 재현 단계
