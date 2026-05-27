# Debug Recorder Admin API 명세서

## 목차

- [개요](#개요)
- [인증](#인증)
- [공통 응답 형식](#공통-응답-형식)
- [사용자 정보 API](#사용자-정보-api)
- [스프레드시트 연동 API](#%EC%8A%A4%ED%94%84%EB%A0%88%EB%93%9C%EC%8B%9C%ED%8A%B8-%EC%97%B0%EB%8F%99-api)
- [대시보드 API](#대시보드-api)
- [워크플로우 API](#워크플로우-api)
- [에러 처리](#에러-처리)
- [속도 제한](#속도-제한)
- [페이지네이션](#페이지네이션)

---

## 개요

이 문서는 Debug Recorder Admin 대시보드 백엔드 서비스에 대한 종합적인 API 문서를 제공합니다.

### 기본 URL

| 환경 | URL |
|-----|-----|
| 개발 | `http://localhost:3000` |
| 스테이징 | `VITE_API_BASE_URL`로 설정 |
| 프로덕션 | `VITE_API_BASE_URL`로 설정 |

### Content Type

모든 요청과 응답은 JSON을 사용합니다:

```
Content-Type: application/json
Accept: application/json
```

---

## 인증

API는 쿠키를 통한 세션 기반 인증을 사용합니다. 인증은 별도의 Admin BFF 서비스에서 처리됩니다.

### 세션 흐름

```
1. 사용자가 Admin BFF를 통해 로그인 → 세션 쿠키 설정
2. 프론트엔드가 API 요청에 쿠키 포함
3. 백엔드가 세션 쿠키 검증
4. 보호된 리소스 반환 또는 401 에러
```

### 헤더

| 헤더 | 설명 |
|-----|------|
| `Cookie` | 세션 쿠키 (브라우저가 자동으로 전송) |
| `X-Request-ID` | 선택적 요청 추적 ID |

### 인증 에러

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다. 로그인해 주세요."
  }
}
```

---

## 공통 응답 형식

### 성공 응답

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T09:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사람이 읽을 수 있는 에러 메시지",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2024-01-15T09:30:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 사용자 정보 API

사용자 프로필, 디바이스 정보, 티켓 템플릿을 관리합니다.

### 사용자 정보 조회

디바이스 정보와 티켓 템플릿을 포함한 전체 사용자 프로필을 조회합니다.

**엔드포인트:** `GET /api/users/:empNo`

**경로 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|-----|:----:|------|
| `empNo` | string | ✅ | 사원번호 (고유 식별자) |

**응답:**

```json
{
  "success": true,
  "data": {
    "empNo": "12345",
    "name": "홍길동",
    "username": "gdhong",
    "email": "gdhong@example.com",
    "jobType": "QA",
    "deviceInfoList": [
      {
        "name": "아이폰 14 프로",
        "deviceId": "device-abc123"
      },
      {
        "name": "삼성 갤럭시 S23",
        "deviceId": "device-def456"
      }
    ],
    "ticketTemplateList": [
      {
        "id": 1,
        "name": "프로젝트 알파 - 버그 리포트",
        "tcSheetLink": "https://docs.google.com/spreadsheets/d/xxx",
        "jiraProjectKey": "ALPHA",
        "epicTicket": "ALPHA-100",
        "titlePrefix": "[Alpha][Bug]",
        "assigneeInfoList": [
          {
            "displayName": "김철수",
            "username": "cskim",
            "email": "cskim@example.com"
          }
        ],
        "componentList": ["Frontend", "API"],
        "labelList": ["bug", "needs-triage"]
      }
    ],
    "lastSelectedTemplate": {
      "id": 1,
      "name": "프로젝트 알파 - 버그 리포트"
    }
  }
}
```

**응답 필드:**

| 필드 | 타입 | 설명 |
|-----|-----|------|
| `empNo` | string | 사원번호 |
| `name` | string | 표시 이름 |
| `username` | string | 로그인 사용자명 |
| `email` | string | 이메일 주소 |
| `jobType` | enum | 직군: `QA`, `PM`, `PD`, `DEV`, `OTHER` |
| `deviceInfoList` | array | 등록된 디바이스 목록 |
| `ticketTemplateList` | array | 티켓 템플릿 목록 |
| `lastSelectedTemplate` | object | 마지막 사용 템플릿 (빠른 선택용) |

---

### 사용자 정보 수정

사용자 프로필, 디바이스, 티켓 템플릿을 수정합니다.

**엔드포인트:** `PUT /api/users/:empNo`

**경로 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|-----|:----:|------|
| `empNo` | string | ✅ | 사원번호 |

**요청 본문:**

```json
{
  "name": "홍길동",
  "username": "gdhong",
  "email": "gdhong@example.com",
  "jobType": "QA",
  "deviceInfoList": [
    {
      "name": "아이폰 14 프로",
      "deviceId": "device-abc123"
    }
  ],
  "ticketTemplateList": [
    {
      "id": 1,
      "name": "프로젝트 알파 - 버그 리포트",
      "tcSheetLink": "https://docs.google.com/spreadsheets/d/xxx",
      "jiraProjectKey": "ALPHA",
      "epicTicket": "ALPHA-100",
      "titlePrefix": "[Alpha][Bug]",
      "assigneeInfoList": [
        {
          "displayName": "김철수",
          "username": "cskim",
          "email": "cskim@example.com"
        }
      ],
      "componentList": ["Frontend", "API"],
      "labelList": ["bug", "needs-triage"]
    }
  ],
  "lastSelectedTemplateName": "프로젝트 알파 - 버그 리포트"
}
```

**요청 본문 필드:**

| 필드 | 타입 | 필수 | 설명 |
|-----|-----|:----:|------|
| `name` | string | ✅ | 표시 이름 |
| `username` | string | ✅ | 로그인 사용자명 |
| `email` | string | ✅ | 이메일 주소 |
| `jobType` | enum | ✅ | 직군 |
| `deviceInfoList` | array | ✅ | 디바이스 목록 (최소 1개 필수) |
| `ticketTemplateList` | array | ❌ | 티켓 템플릿 목록 |
| `lastSelectedTemplateName` | string | ❌ | 마지막 선택 템플릿 이름 |

**디바이스 정보 객체:**

| 필드 | 타입 | 필수 | 설명 |
|-----|-----|:----:|------|
| `name` | string | ❌ | 디바이스 별칭/이름 |
| `deviceId` | string | ✅ | 고유 디바이스 식별자 |

**티켓 템플릿 객체:**

| 필드 | 타입 | 필수 | 설명 |
|-----|-----|:----:|------|
| `id` | number | ❌ | 템플릿 ID (신규 템플릿은 생략) |
| `name` | string | ✅ | 템플릿 이름 |
| `tcSheetLink` | string | ❌ | 스프레드시트 URL |
| `jiraProjectKey` | string | ✅ | 이슈 프로젝트 키 (예: "ALPHA") |
| `epicTicket` | string | ❌ | Epic 티켓 키 (예: "ALPHA-100") |
| `titlePrefix` | string | ❌ | 티켓 제목 접두사 |
| `assigneeInfoList` | array | ❌ | 기본 담당자 목록 |
| `componentList` | array | ❌ | 이슈 컴포넌트 |
| `labelList` | array | ❌ | 이슈 라벨 |

**응답:**

```json
{
  "success": true,
  "data": {
    "message": "사용자 정보가 성공적으로 수정되었습니다",
    "updatedAt": "2024-01-15T09:30:00Z"
  }
}
```

---

## 스프레드시트 연동 API

테스트 케이스 설정을 가져오기 위한 스프레드시트 연동 API입니다.

### TC 시트 읽기

스프레드시트를 파싱하여 티켓 템플릿 설정을 추출합니다.

**엔드포인트:** `GET /api/google-sheets/read-tc-sheet`

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|-----|:----:|------|
| `sheetUrl` | string | ✅ | 전체 스프레드시트 URL |
| `sheetName` | string | ❌ | 탭/시트 이름 (기본값: "DebugRecorder") |

**요청 예시:**

```
GET /api/google-sheets/read-tc-sheet?sheetUrl=https://docs.google.com/spreadsheets/d/abc123/edit&sheetName=Config
```

**응답:**

```json
{
  "success": true,
  "data": {
    "spreadsheetTitle": "QA 테스트 케이스 - 프로젝트 알파",
    "columns": [
      {
        "header": "Tracker",
        "values": [
          { "text": "ALPHA" }
        ]
      },
      {
        "header": "Epic",
        "values": [
          { "text": "ALPHA-100" }
        ]
      },
      {
        "header": "Title Prefix",
        "values": [
          { "text": "[Alpha][Bug]" }
        ]
      },
      {
        "header": "담당자",
        "values": [
          {
            "text": "김철수",
            "userData": {
              "userDisplayName": "김철수",
              "username": "cskim",
              "email": "cskim@example.com"
            }
          },
          {
            "text": "이영희",
            "userData": {
              "userDisplayName": "이영희",
              "username": "yhlee",
              "email": "yhlee@example.com"
            }
          }
        ]
      },
      {
        "header": "컴포넌트",
        "values": [
          { "text": "Frontend" },
          { "text": "API" },
          { "text": "Database" }
        ]
      },
      {
        "header": "레이블",
        "values": [
          { "text": "bug" },
          { "text": "needs-triage" }
        ]
      }
    ]
  }
}
```

**예상 시트 형식:**

스프레드시트에는 다음 컬럼이 있어야 합니다 (헤더 이름은 유연함):

| 컬럼 헤더 | 설명 | 예시 |
|----------|------|-----|
| Tracker / Project / 프로젝트 | 이슈 프로젝트 키 | ALPHA |
| Epic / EPIC | 에픽 티켓 키 | ALPHA-100 |
| Title / Title Prefix / 제목 | 티켓 제목 접두사 | [Alpha][Bug] |
| Assignee / 담당자 | 담당자 (행당 1명) | 김철수 |
| Component / 컴포넌트 | 컴포넌트 (행당 1개) | Frontend |
| Label / 레이블 | 라벨 (행당 1개) | bug |

---

## 대시보드 API

분석 대시보드를 위한 통계 및 추이 데이터입니다.

### 대시보드 통계 조회

대시보드 개요를 위한 집계 통계를 조회합니다.

**엔드포인트:** `GET /api/dashboard/stats`

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|-----|:----:|-------|------|
| `period` | enum | ❌ | `week` | 기간: `day`, `week`, `month` |
| `startDate` | string | ❌ | - | 시작 날짜 (ISO 8601) |
| `endDate` | string | ❌ | - | 종료 날짜 (ISO 8601) |

**응답:**

```json
{
  "success": true,
  "data": {
    "totalRecordRooms": 1250,
    "todayRecordRooms": 45,
    "weeklyAverageRecordRooms": 38.5,
    "totalTickets": 890,
    "todayTickets": 23,
    "weeklyAverage": 31.2,
    "activeUsers": 45,
    "avgSessionDuration": 320
  }
}
```

**응답 필드:**

| 필드 | 타입 | 설명 |
|-----|-----|------|
| `totalRecordRooms` | number | 생성된 총 녹화방 수 |
| `todayRecordRooms` | number | 오늘 생성된 녹화방 수 |
| `weeklyAverageRecordRooms` | number | 주간 평균 녹화방 수 |
| `totalTickets` | number | 생성된 총 티켓 수 |
| `todayTickets` | number | 오늘 생성된 티켓 수 |
| `weeklyAverage` | number | 주간 평균 티켓 수 |
| `activeUsers` | number | 기간 내 활성 사용자 수 |
| `avgSessionDuration` | number | 평균 세션 시간 (초) |

---

### 티켓 추이 조회

차트용 티켓 생성 추이 데이터를 조회합니다.

**엔드포인트:** `GET /api/dashboard/tickets/trend`

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|-----|:----:|-------|------|
| `period` | enum | ✅ | - | 단위: `day`, `week`, `month` |
| `startDate` | string | ❌ | 30일 전 | 시작 날짜 (ISO 8601) |
| `endDate` | string | ❌ | 오늘 | 종료 날짜 (ISO 8601) |

**요청 예시:**

```
GET /api/dashboard/tickets/trend?period=day&startDate=2024-01-01&endDate=2024-01-31
```

**응답:**

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "created": 23,
      "resolved": 18,
      "pending": 5
    },
    {
      "date": "2024-01-02",
      "created": 31,
      "resolved": 25,
      "pending": 11
    }
  ]
}
```

---

### 녹화방 추이 조회

녹화방 생성 추이 데이터를 조회합니다.

**엔드포인트:** `GET /api/dashboard/record-rooms/trend`

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|-----|:----:|-------|------|
| `period` | enum | ✅ | - | 단위: `day`, `week`, `month` |
| `startDate` | string | ❌ | 30일 전 | 시작 날짜 (ISO 8601) |
| `endDate` | string | ❌ | 오늘 | 종료 날짜 (ISO 8601) |

**응답:**

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "created": 45,
      "messages": 230,
      "participants": 12
    },
    {
      "date": "2024-01-02",
      "created": 52,
      "messages": 285,
      "participants": 15
    }
  ]
}
```

---

## 워크플로우 API

팀원 검색 및 워크플로우 연동입니다.

### 멤버 검색

티켓에 할당할 팀원을 검색합니다.

**엔드포인트:** `GET /api/workflow/members`

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|-----|:----:|-------|------|
| `query` | string | ✅ | - | 검색어 (이름, 사용자명, 이메일) |
| `limit` | number | ❌ | 10 | 최대 결과 수 (1-50) |
| `offset` | number | ❌ | 0 | 페이지네이션 오프셋 |

**요청 예시:**

```
GET /api/workflow/members?query=홍&limit=5
```

**응답:**

```json
{
  "success": true,
  "data": [
    {
      "displayName": "홍길동",
      "username": "gdhong",
      "email": "gdhong@example.com",
      "department": "QA팀",
      "avatarUrl": "https://example.com/avatars/gdhong.png"
    },
    {
      "displayName": "홍영희",
      "username": "yhhong",
      "email": "yhhong@example.com",
      "department": "개발팀",
      "avatarUrl": null
    }
  ],
  "meta": {
    "total": 2,
    "limit": 5,
    "offset": 0
  }
}
```

---

## 에러 처리

### 에러 응답 형식

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "잘못된 요청 데이터입니다",
    "details": {
      "field": "email",
      "reason": "이메일 형식이 올바르지 않습니다"
    }
  }
}
```

### 에러 코드

| 코드 | HTTP 상태 | 설명 |
|-----|:---------:|------|
| `UNAUTHORIZED` | 401 | 인증 필요 또는 세션 만료 |
| `FORBIDDEN` | 403 | 권한 부족 |
| `NOT_FOUND` | 404 | 요청한 리소스를 찾을 수 없음 |
| `VALIDATION_ERROR` | 400 | 잘못된 요청 파라미터 |
| `CONFLICT` | 409 | 리소스 충돌 (예: 중복) |
| `RATE_LIMITED` | 429 | 요청 횟수 초과 |
| `INTERNAL_ERROR` | 500 | 내부 서버 오류 |
| `SERVICE_UNAVAILABLE` | 503 | 서비스 일시 중단 |

### HTTP 상태 코드

| 상태 | 설명 |
|:----:|------|
| 200 | 성공 |
| 201 | 생성됨 |
| 204 | 내용 없음 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 접근 금지 |
| 404 | 찾을 수 없음 |
| 409 | 충돌 |
| 429 | 요청 횟수 초과 |
| 500 | 내부 서버 오류 |
| 503 | 서비스 불가 |

---

## 속도 제한

API 요청은 남용 방지를 위해 속도 제한이 적용됩니다.

### 제한

| 제한 유형 | 요청 수 | 시간 윈도우 |
|----------|:------:|:---------:|
| 사용자당 | 100 | 1분 |
| 사용자당 | 1,000 | 1시간 |
| IP당 | 500 | 1분 |

### 속도 제한 헤더

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### 속도 제한 초과 응답

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "요청 횟수가 초과되었습니다. 잠시 후 다시 시도해 주세요.",
    "details": {
      "retryAfter": 60
    }
  }
}
```

---

## 페이지네이션

목록 엔드포인트는 `limit`과 `offset` 파라미터를 사용한 페이지네이션을 지원합니다.

### 요청 파라미터

| 파라미터 | 타입 | 기본값 | 최대값 | 설명 |
|---------|-----|:-----:|:-----:|------|
| `limit` | number | 10 | 100 | 페이지당 항목 수 |
| `offset` | number | 0 | - | 건너뛸 항목 수 |

### 응답 메타

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 10,
    "offset": 20,
    "hasMore": true
  }
}
```

### 예시

```
# 첫 페이지
GET /api/workflow/members?query=team&limit=10&offset=0

# 두 번째 페이지
GET /api/workflow/members?query=team&limit=10&offset=10

# 세 번째 페이지
GET /api/workflow/members?query=team&limit=10&offset=20
```

---

## Remote DevTools API

원격 디버깅 세션을 모니터링하고 제어하기 위한 엔드포인트입니다.

### 세션 목록

**엔드포인트:** `GET /api/remote-devtools/sessions`

**응답 예시:**

```json
{
  "success": true,
  "data": [
    {
      "id": "session-7c9f",
      "name": "iPhone 14 - QA",
      "status": "running",
      "environment": "staging",
      "startedAt": "2024-01-15T10:01:00Z",
      "lastHeartbeatAt": "2024-01-15T10:13:12Z",
      "device": {
        "id": "d-01",
        "name": "iPhone 14",
        "platform": "iOS"
      },
      "participantCount": 2,
      "eventsCount": 132
    }
  ]
}
```

### 세션 이벤트 조회

**엔드포인트:** `GET /api/remote-devtools/sessions/{sessionId}/events`

**응답 예시:**

```json
{
  "success": true,
  "data": {
    "sessionId": "session-7c9f",
    "totalEvents": 132,
    "events": [
      {
        "id": "ev-001",
        "sessionId": "session-7c9f",
        "type": "console.error",
        "level": "error",
        "source": "browser",
        "message": "Unhandled Promise rejection",
        "timestamp": "2024-01-15T10:01:22Z",
        "payload": {
          "url": "/api/orders",
          "status": 500
        }
      }
    ]
  }
}
```

### 세션 제어

**엔드포인트:** `POST /api/remote-devtools/sessions/{sessionId}/commands`

**요청 본문 예시:**

```json
{
  "command": "pause"
}
```

`command` 값: `start`, `pause`, `resume`, `replay`, `disconnect`, `collect`

### 세션 생성

**엔드포인트:** `POST /api/remote-devtools/sessions`

기본 세션을 생성해 연결 대상이 없는 상태에서 바로 제어 흐름을 시작할 수 있습니다.

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|-----|------|----------|
| 1.0.0 | 2024-01 | 최초 API 릴리스 |

---

## 지원

API 이슈나 문의사항:

- 📧 이메일: api-support@example.com
- 📖 문서: [README.md](./README.md)
- 🐛 이슈: [GitHub Issues](https://github.com/your-org/debug-recorder-admin/issues)
