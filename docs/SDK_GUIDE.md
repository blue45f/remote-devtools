# 📱 SDK 사용 가이드

이 문서는 Remote Debug SDK의 상세 사용 방법을 안내합니다.

## 목차

- [개요](#개요)
- [설치](#설치)
- [기본 사용법](#기본-사용법)
- [고급 기능](#고급-기능)
- [UI 컴포넌트](#ui-컴포넌트)
- [이벤트 및 콜백](#이벤트-및-콜백)
- [네트워크 리라이트](#네트워크-리라이트)
- [세션 리플레이](#세션-리플레이)
- [모바일 웹뷰 통합](#모바일-웹뷰-통합)
- [문제 해결](#문제-해결)

---

## 개요

Remote Debug SDK는 웹 애플리케이션에 원격 디버깅 기능을 추가하는 JavaScript 라이브러리입니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| 📡 실시간 데이터 전송 | WebSocket을 통한 CDP 데이터 스트리밍 |
| 💾 자동 버퍼링 | 페이지 로드 시점부터 자동 데이터 수집 |
| 🔄 네트워크 리라이트 | API 응답 모킹 및 변조 |
| 📹 세션 녹화 | rrweb 기반 DOM 녹화 |
| 🎨 플로팅 UI | 커스터마이징 가능한 디버거 버튼 |

### 수집하는 데이터

- **Network**: 모든 HTTP 요청/응답 (XHR, Fetch, WebSocket)
- **Console**: console.log, warn, error, info, debug
- **Runtime**: 전역 에러, Promise rejection
- **DOM**: DOM 변경 이벤트 (MutationObserver)
- **Screen**: 화면 스크린샷 및 DOM 스냅샷

---

## 설치

### CDN (권장)

```html
<script src="http://your-server:3001/sdk/index.umd.js"></script>
```

### NPM (개발용)

```bash
# 프로젝트에 SDK 의존성 추가 (workspace 사용)
pnpm add remote-debug-sdk --workspace-root
```

```javascript
import { createDebugger } from 'remote-debug-sdk';
```

### 직접 빌드

```bash
cd sdk
pnpm build

# 빌드 결과물
# - dist/index.mjs (ES Module)
# - dist/index.umd.js (UMD)
```

---

## 기본 사용법

### 가장 간단한 사용법

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <h1>Hello World</h1>
  
  <!-- SDK 로드 및 초기화 -->
  <script src="http://localhost:3001/sdk/index.umd.js"></script>
</body>
</html>
```

SDK는 로드 시 자동으로 `createDebugger()`를 호출합니다.

### 수동 초기화

자동 초기화를 원하지 않는 경우:

```html
<script>
  // SDK 로드 후 수동 초기화
  window.addEventListener('load', () => {
    if (window.RemoteDebugSdk) {
      window.RemoteDebugSdk.createDebugger();
    }
  });
</script>
<script src="http://localhost:3001/sdk/index.umd.js"></script>
```

### 초기화 옵션

```javascript
// 기본 초기화 (자동 연결 활성화)
window.RemoteDebugSdk.createDebugger();

// 콜백과 함께 초기화
window.RemoteDebugSdk.createDebugger(() => {
  console.log('디버거 버튼이 클릭되었습니다');
});

// 자동 연결 비활성화
window.RemoteDebugSdk.createDebugger(null, false);

// 콜백 + 자동 연결 비활성화
window.RemoteDebugSdk.createDebugger(
  () => console.log('버튼 클릭'),
  false
);
```

---

## 고급 기능

### 버퍼링 모드

SDK는 페이지 로드 시점부터 데이터를 버퍼에 저장합니다:

```
페이지 로드 → 버퍼링 시작 → 녹화 시작 → 버퍼 데이터 전송 → 실시간 전송
```

이 방식의 장점:
- 녹화 시작 전 발생한 이벤트도 캡처
- 페이지 초기 로딩 네트워크 요청 포함
- 초기 콘솔 로그 보존

### 페이지 이탈 시 데이터 보존

페이지를 떠날 때 버퍼 데이터가 자동으로 저장됩니다:

```javascript
// 내부적으로 처리됨
window.addEventListener('beforeunload', () => {
  // 버퍼 데이터를 서버로 전송
  navigator.sendBeacon('/api/buffer', bufferData);
});

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // 화면 이탈 시 데이터 저장
  }
});
```

### Device ID

SDK는 기기를 식별하기 위해 Device ID를 사용합니다:

```javascript
// 네이티브 앱에서 Device ID 제공 (선택적)
window.REMOTE_DEBUG_SDK_COMMON_INFO = async (callback) => {
  const deviceInfo = {
    device: {
      deviceId: 'unique-device-id',
      deviceModel: 'iPhone 14',
      osVersion: 'iOS 17.0'
    },
    user: {
      memberId: 'user-123'
    }
  };
  callback(JSON.stringify(deviceInfo));
};
```

---

## UI 컴포넌트

### 플로팅 버튼

SDK 로드 시 화면 우하단에 플로팅 버튼이 표시됩니다:

```
┌─────────────────────────────────────────┐
│                                         │
│            웹 페이지 내용                 │
│                                         │
│                                         │
│                          ┌────────────┐ │
│                          │ QA 티켓    │ │
│                          │ 녹화 시작   │ │
│                          │ Network    │ │
│                          │ Rewrite    │ │
│                          └────────────┘ │
│                              [ + ]      │
└─────────────────────────────────────────┘
```

### 버튼 기능

| 버튼 | 기능 | 설명 |
|------|------|------|
| QA 티켓 만들기 | 티켓 생성 | Jira 티켓 생성 모달 열기 |
| 녹화 시작 | 세션 녹화 | 현재 세션을 녹화하여 저장 |
| Network Rewrite | 네트워크 모킹 | API 응답 변조 설정 |

### 녹화 토스트

녹화가 시작되면 상태 토스트가 표시됩니다:

```
┌──────────────────────────────────┐
│ 🔴 녹화 중                        │
│ Room: abc123                     │
│ [URL 복사] [종료]                 │
└──────────────────────────────────┘
```

### 가이드 모달

사용 방법을 안내하는 모달:

```javascript
// 프로그래밍 방식으로 가이드 표시
// (내부적으로 ? 버튼 클릭 시 호출됨)
```

---

## 이벤트 및 콜백

### 녹화 시작 이벤트

```javascript
// SDK 내부에서 처리됨
remoteDebugger.onRoomCreated((data) => {
  console.log('녹화 세션 생성됨:', data);
  // data: { roomName, recordId, timestamp }
});
```

### 연결 상태 변경

```javascript
// WebSocket 연결 상태 확인
const isConnected = remoteDebugger.Connected;

// 연결 이벤트 리스너
remoteDebugger.addSocketEventListener('open', () => {
  console.log('서버에 연결됨');
});

remoteDebugger.addSocketEventListener('close', () => {
  console.log('연결이 종료됨');
});

remoteDebugger.addSocketEventListener('error', (error) => {
  console.error('연결 오류:', error);
});
```

---

## 네트워크 리라이트

### 개요

네트워크 리라이트 기능을 사용하면 실제 서버 응답 대신 모킹된 응답을 반환할 수 있습니다.

### UI를 통한 설정

1. 플로팅 버튼 클릭
2. "Network Rewrite" 선택
3. 모킹할 URL 패턴 입력
4. 응답 데이터 설정
5. 저장

### 리라이트 규칙 구조

```javascript
{
  url: '/api/users',          // URL 패턴 (정규식 지원)
  method: 'GET',              // HTTP 메서드
  status: 200,                // 응답 상태 코드
  response: {                 // 응답 본문
    users: [{ id: 1, name: 'Test' }]
  },
  queryString: '',            // 쿼리스트링 필터 (선택)
  requestBody: ''             // 요청 본문 필터 (선택)
}
```

### 사용 예시

#### API 응답 모킹

```javascript
// 사용자 목록 API 모킹
{
  url: '/api/users',
  method: 'GET',
  status: 200,
  response: {
    users: [
      { id: 1, name: '테스트 사용자 1' },
      { id: 2, name: '테스트 사용자 2' }
    ]
  }
}
```

#### 에러 응답 테스트

```javascript
// 500 에러 시뮬레이션
{
  url: '/api/orders',
  method: 'POST',
  status: 500,
  response: {
    error: 'Internal Server Error',
    message: '주문 처리 중 오류가 발생했습니다'
  }
}
```

#### 지연 응답 테스트

```javascript
// 느린 네트워크 시뮬레이션 (추후 지원 예정)
{
  url: '/api/products',
  method: 'GET',
  status: 200,
  delay: 3000,  // 3초 지연
  response: { ... }
}
```

### 리라이트 상태 표시

리라이트가 활성화되면:
- 플로팅 버튼이 주황색으로 변경
- "rewriting.." 툴팁 표시

---

## 세션 리플레이

### 개요

세션 리플레이는 [rrweb](https://github.com/rrweb-io/rrweb)를 사용하여 사용자 세션을 녹화하고 재생합니다.

### 녹화되는 데이터

- DOM 변경 (추가, 삭제, 속성 변경)
- 마우스 움직임 및 클릭
- 스크롤 위치
- 입력 값 변경
- 뷰포트 크기 변경

### 녹화 시작

```javascript
// 플로팅 버튼을 통해 시작
// 또는 프로그래밍 방식으로:
remoteDebugger.createRoom(true, commonInfo);
// true = 녹화 모드
// false = 라이브 모드
```

### 세션 재생

녹화된 세션은 DevTools의 Session Replay 패널에서 재생할 수 있습니다:

1. 세션 목록에서 녹화 선택
2. DevTools URL 클릭
3. Session Replay 패널에서 재생

### 개인정보 보호

민감한 데이터는 자동으로 마스킹됩니다:

```javascript
// 마스킹 대상 선택자
blockSelector: '#REMOTE_DEBUGGER, .remote-debug-sdk-ui'

// 입력 필드 마스킹
input[type="password"]
input[type="credit-card"]
```

---

## 모바일 웹뷰 통합

### Android WebView

```kotlin
// WebView 설정
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true

// JavaScript 인터페이스 추가
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
// JavaScript 메시지 핸들러 설정
let config = WKWebViewConfiguration()
let userContentController = WKUserContentController()

// Device Info 스크립트 주입
let script = """
    window.REMOTE_DEBUG_SDK_COMMON_INFO = function(callback) {
        window.webkit.messageHandlers.deviceInfo.postMessage({});
    };
"""
userContentController.addUserScript(
    WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true)
)
config.userContentController = userContentController
```

### React Native WebView

```jsx
import { WebView } from 'react-native-webview';

const injectedJavaScript = `
  window.REMOTE_DEBUG_SDK_COMMON_INFO = async (callback) => {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'GET_DEVICE_INFO'
    }));
  };
`;

<WebView
  source={{ uri: 'https://your-app.com' }}
  injectedJavaScript={injectedJavaScript}
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'GET_DEVICE_INFO') {
      // Device info 응답
    }
  }}
/>
```

---

## 문제 해결

### SDK가 로드되지 않음

```javascript
// 로드 확인
console.log('SDK loaded:', !!window.RemoteDebugSdk);

// CORS 오류 확인
// 브라우저 콘솔에서 네트워크 탭 확인
```

**해결 방법:**
1. External 서버가 실행 중인지 확인
2. CORS 설정에 현재 도메인 추가
3. SDK URL이 올바른지 확인

### WebSocket 연결 실패

```
WebSocket connection to 'ws://localhost:3001/' failed
```

**해결 방법:**
1. 서버가 실행 중인지 확인
2. 방화벽 설정 확인
3. WebSocket 프로토콜(ws/wss) 확인

### 네트워크 요청이 캡처되지 않음

일부 네트워크 요청이 캡처되지 않는 경우:

**원인:**
- SDK 로드 전에 발생한 요청
- Service Worker에서 처리된 요청
- CORS 정책으로 인한 제한

**해결 방법:**
- SDK를 가능한 빨리 로드
- `<head>` 태그에 SDK 스크립트 배치

### 세션 리플레이가 작동하지 않음

**원인:**
- rrweb 초기화 실패
- 메모리 부족
- 복잡한 DOM 구조

**해결 방법:**
- 페이지 새로고침 후 다시 시도
- 불필요한 DOM 요소 제거
- 녹화 시간 제한

### 로그 레벨 설정

```javascript
// localStorage를 통한 로그 레벨 설정
localStorage.setItem('REMOTE_DEBUG_LOG_LEVEL', 'debug');

// 사용 가능한 레벨: debug, info, warn, error
```

---

## 참고 자료

- [Chrome DevTools Protocol 문서](https://chromedevtools.github.io/devtools-protocol/)
- [rrweb 문서](https://github.com/rrweb-io/rrweb)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
