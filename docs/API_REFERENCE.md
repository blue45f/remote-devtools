# API 참조 문서

Remote DevTools의 REST API 및 WebSocket API 레퍼런스.

---

## 응답 형식

### 성공 응답 (StandardResponse)

```json
{
  "success": true,
  "data": { ... },
  "time": 42
}
```

### 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "deviceId is required"
  }
}
```

### 주요 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `VALIDATION_ERROR` | 400 | 입력값 유효성 검증 실패 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `CONFLICT_ERROR` | 409 | 중복 리소스 |
| `DATABASE_ERROR` | 409 | 데이터베이스 제약 조건 위반 |
| `INTERNAL_ERROR` | 500 | 내부 서버 에러 |

전체 에러 코드 목록: `libs/common/src/exceptions/error-codes.enum.ts`

---

## 서버 구성

| 서버       | 포트   | 역할                                                       |
|------------|--------|-----------------------------------------------------------|
| External   | 3001   | SDK 제공, 데이터 수집, WebSocket 게이트웨이, Jira/Slack 연동 |
| Internal   | 3000   | DevTools UI 제공, 세션 리플레이, 대시보드, 사용자 관리        |

---

## External Server (포트 3001)

### 헬스 체크

```
GET /
GET /health
```

### SDK 제공

```
GET /sdk/index.umd.js
```

### 이미지 Base64 변환

```
GET /image/image_base64?url={imageUrl}
```

### Jira 이미지 업로드

Figma 플러그인에서 Jira 이슈에 이미지를 첨부할 때 사용한다. Internal 서버를 거쳐 Jira REST API v3로 프록시된다.

```
POST /jira/issues/:issueId/image
Content-Type: multipart/form-data
```

| 필드    | 타입   | 설명                    |
|---------|--------|------------------------|
| image   | File   | 이미지 파일 (최대 10MB) |

### 버퍼 저장

SDK가 페이지 이탈(unload) 시 버퍼 데이터를 저장하는 엔드포인트. WebSocket `saveBuffer` 이벤트의 HTTP 대체 경로이다.

```
POST /buffer/save
Content-Type: application/json
```

| 필드        | 타입     | 설명                          |
|------------|--------|-----------------------------|
| deviceId   | string | 디바이스 ID                     |
| url        | string | 현재 페이지 URL                  |
| trigger    | string | 저장 트리거 (예: `pagehide`)      |
| timestamp  | number | 타임스탬프                       |

### Figma 플러그인 API

```
POST /api/figma/user        -- Figma 사용자 등록, 디바이스 정보 반환
POST /api/figma/selection    -- Figma 선택 정보 저장
POST /api/figma/page         -- Figma 페이지 정보 저장
GET  /api/figma/health       -- Figma API 헬스 체크
```

### 녹화 세션 / 통계 (sessions 컨트롤러)

```
GET /sessions/session-detail?sessionName={name}    -- 세션 상세 (screenPreview 포함)
GET /sessions/generate-screenshot?recordId={id}    -- 스크린샷 생성 (Playwright 렌더링)
GET /sessions/ticket-stats                         -- 티켓 생성 통계
GET /sessions/daily-stats                          -- 일별 티켓 통계 (최근 30일)
GET /sessions/component-stats                      -- 컴포넌트별 통계
GET /sessions/label-stats                          -- 라벨별 통계
GET /sessions/session-stats                        -- 녹화 세션 통계
GET /sessions/session-daily-stats                  -- 일별 녹화 세션 통계 (최근 30일)
GET /sessions/user-tickets?deviceId={id}           -- 특정 디바이스 티켓 이력
GET /sessions/user-sessions?deviceId={id}          -- 특정 디바이스 녹화 이력
GET /sessions/tickets-by-epic?parentEpic={epic}    -- Epic별 티켓 조회
GET /sessions/tickets-by-url?url={url}             -- URL별 티켓 조회 (부분 일치)
```

---

## Internal Server (포트 3000)

### 헬스 체크

```
GET /
GET /health
```

### 녹화 세션 (sessions 컨트롤러)

```
GET /sessions                                     -- 라이브 세션 목록
GET /sessions/record                              -- 녹화 세션 목록
GET /sessions/record/:recordId/info               -- 녹화 세션 정보
GET /sessions/record/:recordId/previous           -- 동일 디바이스 이전 녹화 목록 (S3)
GET /sessions/backups?deviceId=&date=&limit=&startDate=&endDate=&beforeDate= -- S3 백업 목록 (내용 포함, 느림)
GET /sessions/backups-light?deviceId=&date=&limit=&startDate=&endDate=&beforeDate= -- S3 백업 목록 (경량, 빠름)
GET /sessions/backup-urls?filePaths={paths}       -- 백업 파일 URL 추출
GET /sessions/backup-viewer                       -- 백업 뷰어 UI
```

### 대시보드

```
GET /api/dashboard/stats                              -- 전체 통계
GET /api/dashboard/tickets/trend?period={day|week|month} -- 티켓 추이
GET /api/dashboard/record-sessions/trend?period={day|week|month} -- 녹화 세션 추이
```

period 파라미터는 `day`, `week`, `month` 중 하나 (필수).
startDate, endDate로 기간 필터 가능.

### 세션 리플레이

```
GET /api/session-replay/sessions?limit=&offset=&room= -- 세션 목록 (페이지네이션)
GET /api/session-replay/sessions/:id                   -- 세션 메타데이터
GET /api/session-replay/sessions/:id/events?startTime=&endTime=&s3FilePath= -- 세션 이벤트 목록
```

이벤트 조회 시 id는 DB recordId, S3 세션 ID (`s3-` 접두어), 또는 s3FilePath 쿼리 파라미터를 지원한다. `startTime`, `endTime`으로 시간 범위를 필터링할 수 있다.

### Google Sheets TC 관리

```
GET /api/google-sheets/read-tc-sheet?sheetUrl={url}&sheetName={name}
```

sheetName 기본값은 `DebugTools`.

### 사용자 프로필

```
GET    /api/user-profile/:empNo          -- 사용자 조회
PUT    /api/user-profile/:empNo/upsert   -- 사용자 생성/수정
DELETE /api/user-profile/:empNo          -- 사용자 삭제
```

### 티켓 폼

```
GET /api/ticket-form-data?deviceId={id}                          -- 티켓 폼 데이터
GET /api/user-templates?deviceId={id}                            -- 사용자 템플릿 목록
GET /api/ticket-form-data-by-template?deviceId={id}&templateName={name} -- 템플릿별 폼 데이터
PUT /api/select-template                                         -- 마지막 선택 템플릿 업데이트
```

### 이미지 Base64 변환

```
GET /image/image_base64?url={imageUrl}
```

External 서버와 동일한 이미지 Base64 변환 기능을 Internal 서버에서도 제공한다.

### Workflow 프록시

```
GET  /workflow/members?name={name}           -- 조직원 검색 (Workflow API 프록시)
POST /workflow/jira/issues/:issueId/image    -- Jira 이미지 첨부 (Jira REST API v3 직접 호출)
```

---

## WebSocket API

### External 게이트웨이 (포트 3001)

SDK 클라이언트가 접속하여 CDP 데이터를 송수신하는 게이트웨이.

#### 클라이언트 -> 서버 메시지

| 이벤트                    | 설명                             | 주요 파라미터                                                |
|--------------------------|----------------------------------|-------------------------------------------------------------|
| `createRoom`             | 녹화/라이브 룸 생성               | `recordMode`, `userData` (commonInfo 포함)                   |
| `createTicket`           | Jira 티켓 생성                   | `userData`, `formData` (Epic, assignee, components, labels)  |
| `protocolToAllDevtools`  | CDP 프로토콜을 전체 DevTools로 전달 | `room`, `message` (JSON 문자열)                              |
| `messageToDevtools`      | 특정 DevTools로 메시지 전달        | `room`, `devtoolsId`, `message`                             |
| `updateResponseBody`     | 네트워크 응답 본문 업데이트         | `room`, `requestId`, `body`, `base64Encoded`                |
| `enableBuffering`        | 버퍼 모드 활성화                   | `deviceId`, `url`, `userAgent`, `timestamp`                 |
| `bufferEvent`            | 버퍼 이벤트 저장                   | `room`, `deviceId`, `url`, `userAgent`, `event`             |
| `saveBuffer`             | 버퍼 데이터 저장 (페이지 이탈 시)   | `deviceId`, `url`, `trigger`, `timestamp`                   |

#### 서버 -> 클라이언트 메시지

| 이벤트                  | 설명                                       |
|------------------------|--------------------------------------------|
| `roomCreated`          | 룸 생성 완료 (roomName, recordId 포함)       |
| `ticketCreateSuccess`  | 티켓 생성 성공                               |
| `ticketCreateError`    | 티켓 생성 실패                               |
| `bufferingEnabled`     | 버퍼 모드 활성화 확인                         |
| `protocol`             | CDP 프로토콜 초기화 메시지 (Domain.enable 등) |
| `error`                | 오류 메시지                                  |

### Internal 게이트웨이 (포트 3000)

DevTools UI가 접속하여 녹화 데이터를 재생하는 게이트웨이. 쿼리 파라미터로 접속 모드를 결정한다.

```
ws://localhost:3000?room={roomName}                         -- 라이브 룸 참여
ws://localhost:3000?recordMode=true&recordId={id}           -- DB 녹화 재생
ws://localhost:3000?s3Backup=true&filePaths={paths}         -- S3 백업 재생
ws://localhost:3000?room={room}&recordId={id}&playbackDevice={deviceId} -- 레거시 백업 재생
```

---

## WebSocket 프로토콜 (CDP)

Chrome DevTools Protocol을 기반으로 한다. 모든 메시지는 JSON.

### 지원 도메인 및 MSG_ID 상수

| 도메인          | 초기화 메시지                     | MSG_ID 상수                      |
|----------------|----------------------------------|----------------------------------|
| Network        | `Network.enable`                 | `MSG_ID.NETWORK.ENABLE`         |
| Runtime        | `Runtime.enable`                 | `MSG_ID.RUNTIME.ENABLE`         |
| Page           | `Page.enable`                    | `MSG_ID.PAGE.ENABLE`            |
| DOM            | `DOM.enable`                     | `MSG_ID.DOM.ENABLE`             |
| ScreenPreview  | `ScreenPreview.startPreview`     | `MSG_ID.SCREEN.START_PREVIEW`   |

추가 MSG_ID: `NETWORK.SET_ATTACH_DEBUG_STACK`, `NETWORK.CLEAR_ACCEPTED_ENCODINGS_OVERRIDE`, `PAGE.GET_RESOURCE_TREE`, `DOM.GET_DOCUMENT`.

### 주요 CDP 메시지

**Network 도메인**

```jsonc
// Network.requestWillBeSent
{ "method": "Network.requestWillBeSent", "params": { "requestId": "...", "request": { "url": "...", "method": "GET" } } }

// Network.responseReceived
{ "method": "Network.responseReceived", "params": { "requestId": "...", "response": { "status": 200 } } }

// Network.getResponseBody
{ "method": "Network.getResponseBody", "params": { "requestId": "...", "body": "...", "base64Encoded": false } }
```

**Runtime 도메인**

```jsonc
// Runtime.consoleAPICalled
{ "method": "Runtime.consoleAPICalled", "params": { "type": "log", "args": [] } }

// Runtime.exceptionThrown
{ "method": "Runtime.exceptionThrown", "params": { "exceptionDetails": { "text": "..." } } }
```

**DOM 도메인**

```jsonc
// DOM.updated
{ "method": "DOM.updated", "params": { "nodeId": 1, "nodeName": "HTML", "children": [] } }
```

**ScreenPreview 도메인**

```jsonc
// ScreenPreview.captured
{ "method": "ScreenPreview.captured", "params": { "head": [], "body": "...", "width": 375, "height": 812, "isFirstSnapshot": true } }
```

**SessionReplay (rrweb)**

```jsonc
// SessionReplay.rrwebEvent
{ "method": "SessionReplay.rrwebEvent", "params": { "event": { "type": 2, "data": {}, "timestamp": 1704067200000 } } }

// SessionReplay.rrwebEvents
{ "method": "SessionReplay.rrwebEvents", "params": { "events": [] } }
```

rrweb 이벤트 타입: 0=DomContentLoaded, 1=Load, 2=FullSnapshot, 3=IncrementalSnapshot, 4=Meta, 5=Custom.

---

## 데이터 엔티티

| 엔티티                  | 용도                                                                 |
|------------------------|----------------------------------------------------------------------|
| RecordEntity           | 녹화 세션 (name, deviceId, recordMode, url, referrer, duration)       |
| NetworkEntity          | 네트워크 요청/응답 (requestId, protocol, responseBody, base64Encoded) |
| DomEntity              | DOM 스냅샷 (type: "entireDom", protocol)                              |
| RuntimeEntity          | 콘솔 로그, 에러 (protocol)                                            |
| ScreenEntity           | 화면 캡처, rrweb 이벤트, 세션 시작/종료 (type, eventType, sequence)     |
| TicketLogEntity        | Jira 티켓 생성 기록                                                   |
| TicketComponentEntity  | 티켓 컴포넌트                                                         |
| TicketLabelEntity      | 티켓 라벨                                                             |
| UserEntity             | 사용자 정보 (name, empNo, slackId, jobType, ticketTemplateList)        |
| DeviceInfoEntity       | 디바이스 정보 (deviceId, user 관계)                                    |
| TicketTemplateListEntity | 사용자 티켓 템플릿 (name, components, labels, assignee)                |

---

## 환경 변수

| 변수                     | 설명                                     |
|--------------------------|------------------------------------------|
| `JIRA_HOST_URL`          | Jira 인스턴스 URL                         |
| `JIRA_API_EMAIL`         | Jira API 이메일                           |
| `JIRA_API_TOKEN`         | Jira API 토큰                             |
| `WORKFLOW_API_URL`       | Workflow API 프록시 URL                    |
| `EXTERNAL_HOST`          | External 서버 호스트 (프로덕션)             |
| `INTERNAL_HOST`          | Internal 서버 호스트 (프로덕션)             |
| `LOCAL_DEVICE_ID`        | 로컬 개발용 디바이스 ID                     |
| `DB_WRITER_HOST`         | 데이터베이스 호스트 (기본값: postgres)       |
| `DB_PORT`                | 데이터베이스 포트 (기본값: 5432)             |
| `DB_USER`                | 데이터베이스 사용자                          |
| `DB_PASSWORD`            | 데이터베이스 비밀번호                        |
| `DB_NAME`                | 데이터베이스 이름                            |
| `APP_ENV`                | 앱 환경 (development/beta/production)      |
| `CORS_ALLOWED_ORIGINS`   | CORS 허용 도메인 (쉼표 구분)                |
| `SLACK_BOT_TOKEN`        | Slack Bot OAuth 토큰                       |
| `SLACK_CHANNEL_ID`       | Slack 알림 채널 ID                           |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google 서비스 계정 이메일                  |
| `GOOGLE_PRIVATE_KEY`     | Google 서비스 계정 비공개 키                  |
| `GOOGLE_SPREADSHEET_ID`  | Google Spreadsheet ID                      |
| `AWS_REGION`             | AWS 리전                                    |
| `AWS_S3_BUCKET`          | S3 버킷 이름                                |
| `NODE_ENV`               | Node.js 환경 (development/production)       |
