# Remote Debug Tools - Figma 플러그인

디자이너가 Figma에서 직접 디버깅 세션을 조회하고 Jira 티켓을 생성할 수 있는 플러그인입니다.

---

## 기능

- **디바이스 목록** - 연결된 디바이스의 모델, OS, 접속 URL 실시간 확인
- **녹화 세션 조회** - 디바이스별 녹화 세션 목록, 스크린 프리뷰, DevTools 링크
- **Jira 티켓 생성** - 녹화 세션 링크와 디바이스 정보가 자동 포함된 티켓 생성

---

## 설치

1. Figma에서 플러그인 > 개발 > 매니페스트에서 플러그인 가져오기를 선택합니다.
2. `figma-plugin/manifest.json` 파일을 선택합니다.

빌드가 필요한 경우:

```bash
cd figma-plugin
pnpm install
pnpm build
```

빌드 후 `dist/manifest.json`을 Figma에서 가져옵니다.

---

## 사용법

1. Figma에서 `Cmd/Ctrl + /`를 누르고 "Remote Debug Tools"를 검색하여 실행합니다.
2. 디바이스 목록에서 대상 디바이스를 선택합니다.
3. 녹화 세션 목록에서 세션을 확인하거나, "티켓 만들기"로 Jira 티켓을 생성합니다.

---

## 개발

```bash
cd figma-plugin
pnpm install
pnpm dev          # 개발 모드 (watch)
pnpm build:dev    # 개발 빌드 (localhost:3001)
pnpm build:prod   # 프로덕션 빌드
```

프로덕션 빌드 시 API URL을 지정합니다:

```bash
VITE_API_URL=https://api.example.com pnpm build:prod
```

### 프로젝트 구조

```
figma-plugin/
├── manifest.json        # Figma 플러그인 매니페스트
├── src/
│   ├── code.ts          # 메인 플러그인 코드
│   ├── ui.ts            # UI 스크립트
│   ├── ui.html          # UI HTML
│   ├── api/             # API 클라이언트
│   ├── handlers/        # 이벤트 핸들러
│   ├── services/        # 서비스 레이어
│   └── state/           # 상태 관리
├── vite.config.ts
└── tsconfig.json
```

---

## 문제 해결

| 증상 | 해결 방법 |
|------|----------|
| API 호출 실패 | `manifest.json`의 `allowedDomains`에 API 도메인 추가, CORS 설정 확인 |
| 플러그인 빈 화면 | Figma 개발자 콘솔에서 오류 확인, `dist/` 폴더에 빌드 결과물 존재 여부 확인 |
| 디바이스 목록 비어있음 | API 서버 실행 여부 확인, SDK가 설치된 페이지에서 디버거 활성화 여부 확인 |
