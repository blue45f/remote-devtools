# SDK 사용 가이드

Remote Debug SDK를 웹 애플리케이션에 통합하는 방법을 설명한다.

---

## 개요

SDK는 웹 페이지에 삽입되어 다음 기능을 제공한다.

- CDP 기반 실시간 데이터 수집 (Network, Runtime, DOM, ScreenPreview)
- 페이지 로드 시점부터 자동 버퍼링
- Jira 티켓 생성 모달 (Jira REST API v3 직접 연동)
- 네트워크 리라이트 (API 응답 모킹)
- 세션 리플레이 녹화 (rrweb 기반)
- 플로팅 버튼 UI

### 수집 데이터

| 도메인           | 수집 대상                                                       |
|---------------|-------------------------------------------------------------|
| Network       | HTTP 요청/응답 (XHR, Fetch), 응답 본문                              |
| Runtime       | console.log/warn/error/info/debug, 전역 에러, Promise rejection |
| DOM           | DOM 변경 이벤트 (MutationObserver)                               |
| ScreenPreview | 화면 HTML 스냅샷 (head, body, viewport 크기)                       |
| SessionReplay | rrweb 이벤트 (DOM 변경, 마우스, 스크롤, 입력)                            |

---

## 설치

### CDN (권장)

```html
<script src="http://your-server:3001/sdk/index.umd.js"></script>
```

SDK는 로드 시 자동으로 초기화된다.

### 직접 빌드

```bash
cd sdk
pnpm build
# 빌드 결과: dist/index.mjs (ESM), dist/index.umd.js (UMD)
```

---

## 기본 사용법

### 자동 초기화

SDK 스크립트를 추가하면 자동으로 `createDebugger()`가 호출된다.

```html
<script src="http://localhost:3001/sdk/index.umd.js"></script>
```

### 수동 초기화

```javascript
// 기본 초기화
window.RemoteDebugSdk.createDebugger();

// 콜백 설정 (플로팅 버튼 클릭 시 호출)
window.RemoteDebugSdk.createDebugger(() => {
  console.log('디버거 버튼 클릭');
});

// 자동 연결 비활성화
window.RemoteDebugSdk.createDebugger(null, false);
```

### 티켓 직접 생성

```javascript
window.RemoteDebugSdk.createTicketDirect(
  remoteDebugger,  // 디버거 인스턴스
  commonInfo,      // CommonInfo 객체 또는 null
  formData         // { Epic, assignee, title, components, labels }
);
```

---

## 버퍼링

SDK는 페이지 로드 시점부터 자동으로 데이터를 버퍼에 수집한다.

```
페이지 로드 -> 버퍼링 시작 -> 녹화/티켓 생성 -> 버퍼 데이터 전송 -> 실시간 전송
```

핵심 동작:
- 녹화 시작 전 발생한 네트워크 요청, 콘솔 로그가 버퍼에 보존된다.
- 페이지 이탈 시 (`beforeunload`, `visibilitychange`) 버퍼 데이터가 S3에 자동 저장된다.
- 버퍼 룸 이름은 `Buffer-{deviceId}-{timestamp}` 형식이다.
- FullSnapshot이 포함되거나 유의미한 이벤트가 5개 이상일 때만 저장된다.

---

## UI 컴포넌트

### 플로팅 버튼

SDK 로드 시 화면 우하단에 플로팅 버튼이 표시된다. 버튼을 누르면 다음 메뉴가 열린다.

| 메뉴              | 기능                                       |
|-----------------|------------------------------------------|
| QA 티켓 만들기       | Jira 티켓 생성 모달. Epic, 담당자, 컴포넌트, 라벨 선택 가능 |
| 녹화 시작           | 현재 세션을 녹화하여 DB에 저장                       |
| Network Rewrite | API 응답 모킹 설정                             |

### 녹화 토스트

녹화가 시작되면 상단에 상태 토스트가 표시된다. 룸 이름, URL 복사, 종료 버튼을 포함한다.

### 리라이트 표시

네트워크 리라이트가 활성화되면 플로팅 버튼이 주황색으로 변경되고 "rewriting.." 툴팁이 표시된다.

---

## 디바이스 정보 연동

네이티브 앱(웹뷰)에서 디바이스 정보를 SDK에 전달할 수 있다.

```javascript
window.REMOTE_DEBUG_SDK_COMMON_INFO = async (callback) => {
  const info = {
    device: {
      deviceId: 'unique-device-id',
      deviceModel: 'iPhone 14',
      osVersion: 'iOS 17.0',
      webUserAgent: navigator.userAgent,
      carrier: 'KT',
      sessionId: 'session-123'
    },
    user: {
      memberId: 'user-123',
      memberNumber: '001',
      authorization: 'Bearer ...'
    },
    URL: window.location.href,
    userAgent: navigator.userAgent,
    supportData: ''
  };
  callback(JSON.stringify(info));
};
```

### Android WebView

```kotlin
webView.addJavascriptInterface(object {
    @JavascriptInterface
    fun REMOTE_DEBUG_SDK_COMMON_INFO(): String {
        return JSONObject().apply {
            put("device", JSONObject().apply {
                put("deviceId", getDeviceId())
                put("deviceModel", Build.MODEL)
                put("osVersion", Build.VERSION.RELEASE)
            })
        }.toString()
    }
}, "AndroidBridge")
```

### iOS WKWebView

```swift
let script = """
    window.REMOTE_DEBUG_SDK_COMMON_INFO = function(callback) {
        window.webkit.messageHandlers.deviceInfo.postMessage({});
    };
"""
userContentController.addUserScript(
    WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true)
)
```

---

## 네트워크 리라이트

플로팅 버튼에서 "Network Rewrite"를 선택하여 API 응답을 모킹할 수 있다.

### 리라이트 규칙 구조

```javascript
{
  url: '/api/users',       // URL 패턴 (정규식 지원)
  method: 'GET',           // HTTP 메서드
  status: 200,             // 응답 상태 코드
  response: { ... },       // 응답 본문
  queryString: '',         // 쿼리스트링 필터 (선택)
  requestBody: ''          // 요청 본문 필터 (선택)
}
```

### 예시

```javascript
// 성공 응답 모킹
{ url: '/api/users', method: 'GET', status: 200, response: { users: [{ id: 1, name: 'Test' }] } }

// 에러 응답 테스트
{ url: '/api/orders', method: 'POST', status: 500, response: { error: 'Internal Server Error' } }
```

---

## 세션 리플레이

[rrweb](https://github.com/rrweb-io/rrweb)를 사용하여 사용자 세션을 녹화한다.

### 녹화 대상

- DOM 변경 (추가, 삭제, 속성 변경)
- 마우스 움직임 및 클릭
- 스크롤 위치
- 입력 값 변경
- 뷰포트 크기 변경

### 녹화 시작

플로팅 버튼에서 "녹화 시작"을 선택하거나 프로그래밍 방식으로 시작한다.

```javascript
// recordMode: true = 녹화 모드, false = 라이브 모드
remoteDebugger.createRoom(true, commonInfo);
```

### 재생

녹화된 세션은 Internal 서버(포트 3000)의 DevTools UI에서 Session Replay 패널을 통해 재생한다.

### 개인정보 보호

SDK UI 요소는 녹화에서 자동으로 제외된다.

```javascript
blockSelector: '#REMOTE_DEBUGGER, .remote-debug-sdk-ui'
```

---

## 타입 정의

### CommonInfo

```typescript
type CommonInfo = {
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
    carrier: string;
    sessionId: string;
    adid: string;
    appsflyerId: string;
  };
  supportData: string;
  URL: string;
  userAgent: string;
};
```

### TicketFormData

```typescript
type TicketFormData = {
  Epic: string;
  assignee: string;
  title?: string;
  components: string[];
  labels?: string[];
};
```

### UserData

```typescript
type UserData = {
  commonInfo?: CommonInfo;
  userAgent: string;
  URL: string;
  webTitle: string;
};
```

---

## 문제 해결

### SDK가 로드되지 않음

1. External 서버(포트 3001)가 실행 중인지 확인한다.
2. 브라우저 콘솔에서 CORS 에러를 확인한다.
3. `console.log('SDK loaded:', !!window.RemoteDebugSdk)` 로 로드 상태를 확인한다.

### WebSocket 연결 실패

1. External 서버가 실행 중인지 확인한다.
2. 방화벽 설정을 확인한다.
3. ws/wss 프로토콜이 올바른지 확인한다.

### 네트워크 요청이 캡처되지 않음

- SDK를 가능한 빨리 로드한다 (`<head>` 태그에 배치 권장).
- SDK 로드 전에 발생한 요청은 캡처되지 않는다.
- Service Worker에서 처리된 요청은 캡처 대상이 아니다.

### 세션 리플레이가 작동하지 않음

- 페이지를 새로고침한 후 다시 시도한다.
- 복잡한 DOM 구조에서는 메모리 부족이 발생할 수 있다.

---

## 참고 자료

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [rrweb](https://github.com/rrweb-io/rrweb)
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
