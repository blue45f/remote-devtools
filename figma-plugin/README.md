# 🎨 Remote Debug Tools - Figma 플러그인

디자이너와 개발자 간의 협업을 위한 Figma 플러그인입니다.

## 📋 목차

- [개요](#개요)
- [기능](#기능)
- [설치](#설치)
- [사용법](#사용법)
- [개발](#개발)
- [배포](#배포)

---

## 개요

이 Figma 플러그인을 사용하면 디자이너가 직접:

- 연결된 디바이스 목록 확인
- 녹화된 디버깅 세션 조회
- Jira 티켓 생성
- 스크린샷과 함께 이슈 리포트

---

## 기능

### 1. 디바이스 목록

실시간으로 연결된 디바이스 목록을 확인합니다:

- 디바이스 모델 및 OS 정보
- 현재 접속 중인 URL
- 마지막 활동 시간

### 2. 녹화 세션 조회

각 디바이스의 녹화 세션을 조회합니다:

- 세션 목록 및 상세 정보
- 스크린 프리뷰 이미지
- DevTools 링크

### 3. Jira 티켓 생성

디버깅 정보가 포함된 Jira 티켓을 생성합니다:

- 자동으로 녹화 세션 링크 포함
- 디바이스 정보 자동 첨부
- 스크린샷 첨부 가능

---

## 설치

### Figma에서 설치

1. Figma Desktop 앱 또는 웹 열기
2. 플러그인 > 개발 > 플러그인 가져오기 > 매니페스트에서
3. `figma-plugin/manifest.json` 파일 선택

### 빌드 후 설치

```bash
# 플러그인 디렉토리로 이동
cd figma-plugin

# 의존성 설치
pnpm install

# 빌드
pnpm build

# Figma에서 dist/manifest.json 가져오기
```

---

## 사용법

### 플러그인 실행

1. Figma에서 파일 열기
2. 메뉴 > 플러그인 > Remote Debug Tools 실행
3. 또는 단축키: `Cmd/Ctrl + /` > "Remote Debug Tools" 검색

### 디바이스 선택

1. 플러그인 UI에서 디바이스 목록 확인
2. 원하는 디바이스 클릭
3. 해당 디바이스의 녹화 세션 및 티켓 목록 표시

### 세션 상세 보기

1. 녹화 세션 목록에서 항목 클릭
2. 스크린 프리뷰 및 상세 정보 확인
3. "DevTools 열기" 버튼으로 전체 세션 재생

### Jira 티켓 생성

1. 디바이스 또는 세션 선택
2. "티켓 만들기" 버튼 클릭
3. 템플릿 선택 및 정보 입력
4. "생성" 버튼 클릭

---

## 개발

### 환경 설정

```bash
# 의존성 설치
cd figma-plugin
pnpm install

# 개발 모드 (watch)
pnpm dev
```

### 프로젝트 구조

```
figma-plugin/
├── manifest.json          # Figma 플러그인 매니페스트
├── src/
│   ├── code.ts           # 메인 플러그인 코드 (Figma API)
│   ├── ui.ts             # UI 스크립트
│   ├── ui.html           # UI HTML
│   ├── api/
│   │   └── ApiClient.ts  # API 클라이언트
│   ├── handlers/
│   │   ├── device.handler.ts
│   │   ├── room.handler.ts
│   │   └── jira.handler.ts
│   ├── services/
│   │   ├── api.service.ts
│   │   └── device.service.ts
│   └── state/
│       └── app.state.ts  # 상태 관리
├── vite.config.ts        # Vite 빌드 설정
└── tsconfig.json
```

### 빌드 명령어

```bash
# 개발 빌드 (localhost:3001)
pnpm build:dev

# 프로덕션 빌드 (환경변수 기반)
VITE_API_URL=https://api.example.com pnpm build:prod

# 빌드 결과 확인
pnpm verify
```

### API URL 설정

```bash
# 환경변수로 API URL 설정
export VITE_API_URL=http://localhost:3001

# 또는 빌드 시 직접 지정
VITE_API_URL=https://api.example.com pnpm build:prod
```

---

## 배포

### Figma Community 배포

1. 플러그인 빌드
```bash
VITE_API_URL=https://your-api.com pnpm build:prod
```

2. Figma Developer Console 접속
   - https://www.figma.com/developers/

3. 새 플러그인 생성 또는 업데이트

4. `manifest.json` 정보 입력
   - 이름, 설명, 아이콘 등

5. 플러그인 파일 업로드

6. 검토 및 게시

### 내부 배포

조직 내부에서만 사용하는 경우:

1. 빌드된 파일 공유
2. 각 사용자가 "매니페스트에서 가져오기"로 설치
3. 또는 Figma Organization의 Private 플러그인으로 등록

---

## 환경 설정

### manifest.json 수정

```json
{
  "name": "Remote Debug Tools",
  "id": "your-plugin-id",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "networkAccess": {
    "allowedDomains": [
      "http://localhost:3001",
      "https://your-api.com"
    ],
    "reasoning": "API 서버 통신"
  }
}
```

### 허용 도메인 추가

프로덕션 배포 시 `allowedDomains`에 실제 API 도메인 추가 필요.

---

## 문제 해결

### 네트워크 오류

**증상**: API 호출 실패

**해결**:
1. `allowedDomains`에 API 도메인 추가
2. CORS 설정 확인
3. API 서버 상태 확인

### 플러그인 로드 실패

**증상**: 플러그인 실행 시 빈 화면

**해결**:
1. 개발자 콘솔 확인 (Figma > Plugins > Development > Open Console)
2. 빌드 오류 확인
3. `dist/` 폴더에 파일이 생성되었는지 확인

### 디바이스 목록 안 뜸

**증상**: 디바이스 목록이 비어있음

**해결**:
1. API 서버 실행 확인
2. SDK가 설치된 페이지에서 디버거 활성화 확인
3. 네트워크 탭에서 API 응답 확인

---

## 참고 자료

- [Figma Plugin API 문서](https://www.figma.com/plugin-docs/)
- [Figma Plugin Samples](https://github.com/figma/plugin-samples)
