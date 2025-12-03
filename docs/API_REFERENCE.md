# 📚 API 참조 문서

이 문서는 Remote Debug Tools의 REST API와 WebSocket API를 설명합니다.

## 목차

- [개요](#개요)
- [인증](#인증)
- [External Server API](#external-server-api)
- [Internal Server API](#internal-server-api)
- [WebSocket API](#websocket-api)
- [에러 처리](#에러-처리)

---

## 개요

### Base URLs

| 서버 | URL | 용도 |
|------|-----|------|
| External | `http://localhost:3001` | SDK, 데이터 수집 |
| Internal | `http://localhost:3000` | 관리, 재생 |

### 공통 헤더

```http
Content-Type: application/json
Accept: application/json
```

### 응답 형식

모든 API는 JSON 형식으로 응답합니다:

```json
{
  "success": true,
  "data": { ... },
  "message": "요청이 성공적으로 처리되었습니다"
}
```

에러 응답:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": { ... }
  }
}
```

---

## 인증

현재 버전에서는 인증이 필요하지 않습니다. 프로덕션 환경에서는 적절한 인증 메커니즘을 구현하는 것을 권장합니다.

---

## External Server API

### 헬스 체크

서버 상태를 확인합니다.

```http
GET /health
```

**응답**

```json
{
  "status": "ok"
}
```

---

### SDK 제공

SDK JavaScript 파일을 제공합니다.

```http
GET /sdk/index.umd.js
```

**응답**: JavaScript 파일

---

### 녹화 세션 목록

녹화 세션 목록을 조회합니다.

```http
GET /rooms
```

**쿼리 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| type | string | 아니오 | `record` 또는 `live` |

**응답**

```json
{
  "rooms": [
    {
      "name": "Room-abc123",
      "id": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "recordMode": true
    }
  ]
}
```

---

### 녹화 세션 상세

특정 녹화 세션의 상세 정보를 조회합니다.

```http
GET /webview/:recordId/details
```

**경로 파라미터**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| recordId | number | 녹화 세션 ID |

**응답**

```json
{
  "room": {
    "id": 1,
    "name": "Room-abc123",
    "deviceId": "device-123",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "recordMode": true
  },
  "screenPreview": {
    "snapshot": "...",
    "width": 375,
    "height": 812
  }
}
```

---

### Jira 티켓 생성

Jira 티켓을 생성합니다.

```http
POST /jira/create-ticket
```

**요청 본문**

```json
{
  "title": "버그: 로그인 실패",
  "description": "로그인 시 에러 발생",
  "projectKey": "PROJECT",
  "issueType": "Bug",
  "assignee": "user@example.com",
  "labels": ["bug", "urgent"],
  "components": ["Frontend"],
  "recordLink": "http://localhost:3000/room/abc123"
}
```

**응답**

```json
{
  "success": true,
  "ticket": {
    "key": "PROJECT-123",
    "url": "https://your-domain.atlassian.net/browse/PROJECT-123"
  }
}
```

---

### Slack 알림 전송

Slack 채널에 알림을 전송합니다.

```http
POST /slack/send
```

**요청 본문**

```json
{
  "roomName": "Room-abc123",
  "recordLink": "http://localhost:3000/room/abc123",
  "userData": {
    "deviceId": "device-123",
    "platform": "iOS",
    "appVersion": "1.0.0"
  }
}
```

**응답**

```json
{
  "success": true,
  "messageTs": "1234567890.123456"
}
```

---

### 버퍼 데이터 저장

페이지 이탈 시 버퍼 데이터를 저장합니다.

```http
POST /buffer/save
```

**요청 본문**

```json
{
  "deviceId": "device-123",
  "room": "Buffer-device-123-1704067200000",
  "url": "https://example.com/page",
  "userAgent": "Mozilla/5.0...",
  "bufferData": [
    {
      "method": "Network.requestWillBeSent",
      "params": { ... }
    }
  ]
}
```

**응답**

```json
{
  "success": true,
  "savedCount": 150
}
```

---

### 이미지 Base64 변환

이미지 URL을 Base64로 변환합니다.

```http
POST /image-base64/convert
```

**요청 본문**

```json
{
  "url": "https://example.com/image.png"
}
```

**응답**

```json
{
  "success": true,
  "base64": "data:image/png;base64,iVBORw0KGgo..."
}
```

---

## Internal Server API

### 헬스 체크

```http
GET /health
```

**응답**

```json
{
  "status": "ok"
}
```

---

### 대시보드 통계

전체 통계를 조회합니다.

```http
GET /dashboard/stats
```

**응답**

```json
{
  "totalRecordRooms": 1500,
  "todayRecordRooms": 25,
  "weeklyAverageRecordRooms": 18.5,
  "totalTickets": 320,
  "todayTickets": 5
}
```

---

### 녹화 세션 추이

기간별 녹화 세션 생성 추이를 조회합니다.

```http
GET /dashboard/record-room-trend
```

**쿼리 파라미터**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| period | string | 아니오 | week | `week`, `month`, `quarter` |

**응답**

```json
{
  "trend": [
    {
      "date": "2024-01-01",
      "created": 25,
      "developer": 10,
      "designer": 5,
      "qa": 8,
      "other": 2
    }
  ]
}
```

---

### 세션 리플레이 데이터

녹화된 세션의 리플레이 데이터를 조회합니다.

```http
GET /session-replay/:recordId
```

**경로 파라미터**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| recordId | number | 녹화 세션 ID |

**응답**

```json
{
  "metadata": {
    "id": 1,
    "roomName": "Room-abc123",
    "deviceId": "device-123",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T00:10:00.000Z",
    "duration": 600000
  },
  "events": [
    {
      "id": 1,
      "event_type": "Network.requestWillBeSent",
      "protocol": { ... },
      "timestamp": 1704067200000,
      "relativeTime": 0
    }
  ],
  "rrwebEvents": [
    {
      "type": 4,
      "data": { ... },
      "timestamp": 1704067200000
    }
  ]
}
```

---

### Google Sheets 템플릿 조회

Google Sheets에서 티켓 템플릿을 조회합니다.

```http
GET /google-sheets/templates
```

**쿼리 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| sheetId | string | 아니오 | 스프레드시트 ID |
| sheetName | string | 아니오 | 시트 이름 (기본: DebugTools) |

**응답**

```json
{
  "templates": [
    {
      "id": "template-1",
      "name": "버그 리포트",
      "epic": "EPIC-1",
      "assignee": "user@example.com",
      "components": ["Frontend"],
      "labels": ["bug"]
    }
  ]
}
```

---

## WebSocket API

### 연결

```javascript
const ws = new WebSocket('ws://localhost:3001?room=Room-abc123&deviceId=device-123');
```

**쿼리 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| room | string | 예 | 방 이름 |
| deviceId | string | 아니오 | 디바이스 ID |
| recordMode | boolean | 아니오 | 녹화 모드 여부 |
| recordId | number | 아니오 | 녹화 세션 ID |

---

### 메시지 형식

모든 WebSocket 메시지는 JSON 형식입니다:

```json
{
  "id": 1,
  "method": "Domain.method",
  "params": { ... }
}
```

---

### CDP 도메인

#### Network 도메인

```json
// 요청 시작
{
  "method": "Network.requestWillBeSent",
  "params": {
    "requestId": "req-1",
    "request": {
      "url": "https://api.example.com/data",
      "method": "GET",
      "headers": { ... }
    },
    "timestamp": 1704067200000
  }
}

// 응답 수신
{
  "method": "Network.responseReceived",
  "params": {
    "requestId": "req-1",
    "response": {
      "status": 200,
      "headers": { ... }
    }
  }
}

// 응답 본문
{
  "method": "Network.getResponseBody",
  "params": {
    "requestId": "req-1",
    "body": "{ ... }",
    "base64Encoded": false
  }
}
```

#### Runtime 도메인

```json
// 콘솔 로그
{
  "method": "Runtime.consoleAPICalled",
  "params": {
    "type": "log",
    "args": [
      {
        "type": "string",
        "value": "Hello World"
      }
    ],
    "timestamp": 1704067200000
  }
}

// 에러
{
  "method": "Runtime.exceptionThrown",
  "params": {
    "exceptionDetails": {
      "text": "Uncaught Error",
      "exception": {
        "description": "Error: Something went wrong"
      },
      "stackTrace": {
        "callFrames": [ ... ]
      }
    }
  }
}
```

#### DOM 도메인

```json
// DOM 스냅샷
{
  "method": "DOM.setDocument",
  "params": {
    "root": {
      "nodeId": 1,
      "nodeName": "HTML",
      "childNodeCount": 2,
      "children": [ ... ]
    }
  }
}
```

#### Page 도메인

```json
// 페이지 로드
{
  "method": "Page.loadEventFired",
  "params": {
    "timestamp": 1704067200000
  }
}

// 프레임 탐색
{
  "method": "Page.frameNavigated",
  "params": {
    "frame": {
      "id": "main",
      "url": "https://example.com/page"
    }
  }
}
```

---

### 특수 메시지

#### 방 생성 요청

```json
{
  "id": 1,
  "method": "createRoom",
  "params": {
    "recordMode": true,
    "commonInfo": { ... }
  }
}
```

#### 방 생성 응답

```json
{
  "id": 1,
  "method": "roomCreated",
  "params": {
    "roomName": "Room-abc123",
    "recordId": 1,
    "timestamp": 1704067200000
  }
}
```

#### 티켓 생성 요청

```json
{
  "id": 2,
  "method": "createTicket",
  "params": {
    "commonInfo": { ... },
    "userAgent": "Mozilla/5.0...",
    "URL": "https://example.com/page",
    "formData": {
      "Epic": "EPIC-1",
      "assignee": "user@example.com"
    }
  }
}
```

---

## 에러 처리

### HTTP 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 접근 거부 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |
| 503 | 서비스 불가 |

### 에러 코드 목록

| 코드 | 설명 |
|------|------|
| AUTH_USER_NOT_FOUND | 사용자를 찾을 수 없음 |
| AUTH_UNAUTHORIZED | 인증되지 않음 |
| DEVICE_NOT_FOUND | 디바이스를 찾을 수 없음 |
| VALIDATION_FAILED | 유효성 검사 실패 |
| RESOURCE_NOT_FOUND | 리소스를 찾을 수 없음 |
| EXTERNAL_SERVICE_ERROR | 외부 서비스 오류 |
| JIRA_ERROR | Jira 연동 오류 |
| SLACK_ERROR | Slack 연동 오류 |

### 에러 응답 예시

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "녹화 세션을 찾을 수 없습니다",
    "details": {
      "recordId": 999
    }
  },
  "statusCode": 404
}
```

---

## Rate Limiting

현재 버전에서는 Rate Limiting이 구현되어 있지 않습니다. 프로덕션 환경에서는 적절한 Rate Limiting을 구현하는 것을 권장합니다.

권장 설정:
- API 요청: 100 req/min
- WebSocket 메시지: 1000 msg/min
- 파일 업로드: 10 req/min

---

## SDK API

### window.RemoteDebugSdk

```typescript
interface RemoteDebugSdk {
  createDebugger(
    onClickCallback?: () => void,
    autoConnect?: boolean
  ): void;
  
  createTicketDirect(
    remoteDebugger: RemoteDebugger,
    commonInfo: CommonInfo | null,
    formData?: TicketFormData
  ): void;
}
```

### 타입 정의

```typescript
interface CommonInfo {
  user: {
    userAppData?: string;
    authorization: string;
    memberId: string;
    memberNumber: string;
  };
  device: {
    deviceId: string;
    deviceModel: string;
    osVersion: string;
    webUserAgent: string;
  };
  URL: string;
  userAgent: string;
}

interface TicketFormData {
  Epic?: string;
  assignee?: string;
  title?: string;
  components?: string[];
  labels?: string[];
}
```
