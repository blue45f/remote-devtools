# 🤝 기여 가이드

Remote Debug Tools 프로젝트에 관심을 가져주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 목차

- [행동 강령](#행동-강령)
- [기여 방법](#기여-방법)
- [개발 환경 설정](#개발-환경-설정)
- [코드 스타일](#코드-스타일)
- [커밋 컨벤션](#커밋-컨벤션)
- [Pull Request 가이드](#pull-request-가이드)
- [이슈 리포트](#이슈-리포트)
- [문서 기여](#문서-기여)

---

## 행동 강령

이 프로젝트는 모든 참여자에게 열린 환경을 제공하기 위해 노력합니다.

### 기대하는 행동

- 서로를 존중하고 배려하는 언어 사용
- 건설적인 피드백 제공 및 수용
- 커뮤니티의 다양성 존중
- 협력적인 자세로 토론 참여

### 허용되지 않는 행동

- 모욕적이거나 차별적인 언어 사용
- 개인 공격 또는 괴롭힘
- 허가 없이 타인의 개인정보 공개
- 기타 비윤리적인 행동

---

## 기여 방법

### 1. 버그 수정

버그를 발견하셨나요? 다음 단계를 따라주세요:

1. 기존 이슈에서 같은 버그가 보고되었는지 확인
2. 새로운 이슈 생성 (버그 템플릿 사용)
3. 수정 사항이 있다면 Pull Request 제출

### 2. 새로운 기능

새로운 기능을 제안하고 싶으신가요?

1. GitHub Discussions에서 아이디어 공유
2. 커뮤니티 피드백 수집
3. 승인 후 개발 진행
4. Pull Request 제출

### 3. 문서 개선

문서에 오류가 있거나 개선이 필요한 부분이 있나요?

- README, 가이드 문서 수정
- 코드 주석 개선
- 예제 추가

### 4. 번역

다국어 지원을 위한 번역에 참여해 주세요:

- 한국어 ↔ 영어 번역
- 문서 국제화

---

## 개발 환경 설정

### 필수 도구

```bash
# Node.js v20 이상
node --version

# pnpm v9 이상
pnpm --version

# Docker Desktop
docker --version
```

### 프로젝트 설정

```bash
# 1. 저장소 Fork 및 Clone
git clone https://github.com/YOUR_USERNAME/remote-debug-tools.git
cd remote-debug-tools

# 2. 의존성 설치
pnpm install

# 3. 환경변수 설정
cp .env.example apps/remote-platform-external/src/.env.local
cp .env.example apps/remote-platform-internal/src/.env.local

# 4. 데이터베이스 시작
docker-compose up postgres -d

# 5. 개발 서버 시작
pnpm start:external:dev  # 터미널 1
pnpm start:internal:dev  # 터미널 2
```

### IDE 설정

#### VS Code 권장 확장

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker"
  ]
}
```

#### 설정 파일

프로젝트에 포함된 `.vscode/settings.json`을 사용하세요.

---

## 코드 스타일

### TypeScript

```typescript
// ✅ Good: 명시적 타입 선언
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad: any 타입 사용
function calculateTotal(items: any): any {
  return items.reduce((sum: any, item: any) => sum + item.price, 0);
}
```

### 네이밍 컨벤션

| 타입 | 컨벤션 | 예시 |
|------|--------|------|
| 변수, 함수 | camelCase | `getUserData`, `totalCount` |
| 클래스, 인터페이스 | PascalCase | `UserService`, `NetworkData` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| 파일명 | kebab-case 또는 camelCase | `user-service.ts`, `networkData.ts` |

### ESLint & Prettier

코드 스타일은 ESLint와 Prettier로 자동 관리됩니다:

```bash
# 린트 검사
pnpm eslint apps libs sdk --ext .ts

# 자동 수정
pnpm eslint apps libs sdk --ext .ts --fix

# Prettier 적용
pnpm prettier --write "**/*.{ts,tsx,json}"
```

### 파일 구조

```typescript
// 1. 외부 라이브러리 import
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

// 2. 내부 모듈 import (절대 경로)
import { Record } from '@remote-platform/entity';

// 3. 상대 경로 import
import { utils } from './utils';

// 4. 타입 정의
interface ServiceOptions {
  timeout: number;
}

// 5. 클래스/함수 구현
@Injectable()
export class MyService {
  // ...
}
```

---

## 커밋 컨벤션

### 커밋 메시지 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 목록

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 | `feat(sdk): add network rewrite feature` |
| `fix` | 버그 수정 | `fix(api): resolve connection timeout issue` |
| `docs` | 문서 변경 | `docs: update installation guide` |
| `style` | 코드 포맷팅 | `style: apply prettier formatting` |
| `refactor` | 리팩토링 | `refactor(service): simplify data processing` |
| `test` | 테스트 추가/수정 | `test(api): add unit tests for user service` |
| `chore` | 빌드, 설정 변경 | `chore: update dependencies` |
| `perf` | 성능 개선 | `perf(sdk): optimize DOM snapshot` |

### Scope 목록

| Scope | 설명 |
|-------|------|
| `sdk` | SDK 관련 |
| `api` | API 서버 관련 |
| `client` | 클라이언트 관련 |
| `figma` | Figma 플러그인 관련 |
| `docs` | 문서 관련 |
| `deps` | 의존성 관련 |

### 커밋 메시지 예시

```bash
# 기능 추가
git commit -m "feat(sdk): add session replay pause/resume functionality

- Add pause() and resume() methods to SessionReplay class
- Update UI to show pause state
- Add keyboard shortcut (Space) for pause toggle

Closes #123"

# 버그 수정
git commit -m "fix(api): resolve WebSocket reconnection issue

The WebSocket connection was not properly re-establishing
after a network interruption. Added retry logic with
exponential backoff.

Fixes #456"

# 문서 수정
git commit -m "docs: add Korean translation for README"
```

---

## Pull Request 가이드

### PR 체크리스트

Pull Request 생성 전 확인해 주세요:

- [ ] 관련 이슈에 링크됨
- [ ] 타입체크 통과 (`pnpm typecheck`)
- [ ] 린트 검사 통과 (`pnpm eslint ...`)
- [ ] 빌드 성공 (`pnpm build:internal && pnpm build:external`)
- [ ] 문서 업데이트 (필요한 경우)
- [ ] 테스트 추가/수정 (필요한 경우)

### PR 템플릿

```markdown
## 📋 개요

<!-- 변경사항을 간단히 설명해 주세요 -->

## 🔗 관련 이슈

<!-- 관련 이슈 번호를 입력해 주세요 -->
Closes #

## 📝 변경 내용

<!-- 주요 변경사항을 나열해 주세요 -->
- 
- 
- 

## 🧪 테스트 방법

<!-- 변경사항을 테스트하는 방법을 설명해 주세요 -->
1. 
2. 
3. 

## 📸 스크린샷 (선택)

<!-- UI 변경이 있는 경우 스크린샷을 첨부해 주세요 -->

## ✅ 체크리스트

- [ ] 타입체크 통과
- [ ] 린트 검사 통과
- [ ] 빌드 성공
- [ ] 문서 업데이트
```

### 리뷰 프로세스

1. **PR 제출**: 위 템플릿에 따라 PR 작성
2. **자동 검사**: CI가 자동으로 테스트 실행
3. **코드 리뷰**: 메인테이너가 코드 리뷰 진행
4. **수정 요청**: 필요시 피드백에 따라 수정
5. **승인 및 머지**: 승인 후 squash merge

---

## 이슈 리포트

### 버그 리포트 템플릿

```markdown
## 🐛 버그 설명

<!-- 버그에 대해 명확하게 설명해 주세요 -->

## 📋 재현 단계

1. '...'로 이동
2. '...'를 클릭
3. '...'까지 스크롤
4. 에러 발생

## ✅ 예상 동작

<!-- 정상적으로 어떻게 동작해야 하는지 설명해 주세요 -->

## ❌ 실제 동작

<!-- 실제로 어떻게 동작하는지 설명해 주세요 -->

## 🖥️ 환경

- OS: [예: macOS 14.0]
- 브라우저: [예: Chrome 120]
- Node.js 버전: [예: 20.10.0]
- 프로젝트 버전: [예: 1.0.0]

## 📸 스크린샷/로그

<!-- 관련 스크린샷이나 에러 로그를 첨부해 주세요 -->

## 📝 추가 정보

<!-- 기타 관련 정보를 추가해 주세요 -->
```

### 기능 요청 템플릿

```markdown
## 💡 기능 설명

<!-- 제안하는 기능에 대해 설명해 주세요 -->

## 🎯 동기

<!-- 이 기능이 필요한 이유를 설명해 주세요 -->

## 📝 상세 설계

<!-- 기능이 어떻게 동작해야 하는지 설명해 주세요 -->

## 🔄 대안

<!-- 고려한 대안이 있다면 설명해 주세요 -->

## 📋 추가 정보

<!-- 기타 관련 정보를 추가해 주세요 -->
```

---

## 문서 기여

### 문서 구조

```
docs/
├── INSTALLATION.md      # 설치 가이드
├── SDK_GUIDE.md         # SDK 사용 가이드
├── API_REFERENCE.md     # API 참조
├── CONTRIBUTING.md      # 기여 가이드 (현재 문서)
└── TROUBLESHOOTING.md   # 문제 해결 가이드
```

### 문서 작성 규칙

1. **한글 사용**: 기본적으로 한글로 작성
2. **명확한 제목**: 이모지와 함께 명확한 제목 사용
3. **코드 예시**: 가능한 경우 코드 예시 포함
4. **목차**: 긴 문서는 목차 포함

### 마크다운 스타일

```markdown
# 제목 1
## 제목 2
### 제목 3

- 목록 항목 1
- 목록 항목 2

1. 번호 목록 1
2. 번호 목록 2

**굵은 글씨**
*이탤릭*
`인라인 코드`

```코드 블록```

| 테이블 | 헤더 |
|--------|------|
| 내용 | 내용 |
```

---

## 질문이 있으신가요?

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **GitHub Discussions**: 일반적인 질문 및 토론

감사합니다! 🙏
