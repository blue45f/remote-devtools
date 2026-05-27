# Debug Recorder Admin 기여 가이드

먼저 Debug Recorder Admin에 기여를 고려해 주셔서 감사합니다! 🎉

이 문서는 프로젝트에 기여하기 위한 가이드라인과 지침을 제공합니다.

## 목차

- [행동 강령](#행동-강령)
- [시작하기](#시작하기)
- [개발 환경 설정](#개발-환경-설정)
- [변경 작업](#변경-작업)
- [코딩 표준](#코딩-표준)
- [커밋 가이드라인](#커밋-가이드라인)
- [Pull Request 프로세스](#pull-request-프로세스)
- [버그 리포트](#버그-리포트)
- [기능 제안](#기능-제안)

---

## 행동 강령

이 프로젝트는 행동 강령을 준수합니다. 참여함으로써 이 코드를 지킬 것으로 기대됩니다.

- 존중하고 포용적으로 행동합니다
- 새로운 참여자를 환영하고 배움을 돕습니다
- 커뮤니티에 가장 좋은 것에 집중합니다
- 다른 커뮤니티 멤버에게 공감을 보여줍니다

---

## 시작하기

### 사전 요구사항

시작하기 전에 다음이 설치되어 있는지 확인하세요:

- **Node.js** 20.x 이상
- **pnpm** 8.9.2 이상
- **Git**

### 포크 및 클론

1. GitHub에서 저장소를 포크합니다
2. 포크한 저장소를 로컬에 클론합니다:

```bash
git clone https://github.com/YOUR_USERNAME/debug-recorder-admin.git
cd debug-recorder-admin
```

3. 업스트림 리모트를 추가합니다:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/debug-recorder-admin.git
```

---

## 개발 환경 설정

### 의존성 설치

```bash
pnpm install
```

### 환경 설정

```bash
cp .env.example .env
```

로컬 설정에 맞게 `.env` 파일을 수정합니다.

### 개발 서버 시작

```bash
pnpm dev
```

애플리케이션은 `https://localhost:5173`에서 접근 가능합니다.

### 설정 확인

모든 것이 정상 작동하는지 확인하기 위해 다음 명령어를 실행합니다:

```bash
# 타입 검사
pnpm typecheck

# 린팅
pnpm lint

# 빌드
pnpm build
```

---

## 변경 작업

### 브랜치 네이밍

설명적인 이름으로 브랜치를 생성합니다:

```bash
# 기능
git checkout -b feature/다크모드-추가

# 버그 수정
git checkout -b fix/로그인-리다이렉트-이슈

# 문서
git checkout -b docs/api-스펙-업데이트

# 리팩토링
git checkout -b refactor/인증-로직-단순화
```

### 브랜치 최신 상태 유지

정기적으로 업스트림과 동기화합니다:

```bash
git fetch upstream
git rebase upstream/main
```

---

## 코딩 표준

### TypeScript

- 엄격한 TypeScript 사용 - 정당한 이유 없이 `any` 타입 금지
- 모든 props와 state에 인터페이스 정의
- 가능한 경우 타입 추론 사용
- 재사용될 수 있는 타입은 export

```typescript
// ✅ 좋음
interface UserCardProps {
  user: User
  onSelect: (userId: string) => void
}

const UserCard: React.FC<UserCardProps> = ({ user, onSelect }) => {
  // ...
}

// ❌ 나쁨
const UserCard = ({ user, onSelect }: any) => {
  // ...
}
```

### React 컴포넌트

- 함수형 컴포넌트와 훅 사용
- 컴포넌트를 집중적이고 단일 책임으로 유지
- 재사용 가능한 로직은 커스텀 훅으로 분리
- 의미 있는 컴포넌트와 prop 이름 사용

```typescript
// ✅ 좋음 - 집중된 컴포넌트
const UserAvatar: React.FC<{ user: User; size?: 'sm' | 'md' | 'lg' }> = ({
  user,
  size = 'md'
}) => {
  return <Avatar src={user.avatarUrl} size={size} alt={user.name} />
}

// ❌ 나쁨 - 너무 많은 책임
const UserCard = ({ user, tickets, rooms, onEdit, onDelete, onViewTickets }) => {
  // 너무 많은 것을 처리함
}
```

### 파일 구조

```
src/components/UserProfile/
├── index.ts              # 공개 exports
├── UserProfile.tsx       # 메인 컴포넌트
├── UserProfileForm.tsx   # 하위 컴포넌트
├── hooks/
│   └── useUserProfile.ts # 컴포넌트 전용 훅
└── types.ts              # 컴포넌트 전용 타입
```

### 스타일링

- Ant Design 컴포넌트를 주요 UI 라이브러리로 사용
- 간단한 경우 인라인 스타일 선호
- 복잡한 스타일링이 필요한 경우 CSS 모듈 사용
- 반응형 디자인 원칙 준수

### 코드 포맷팅

코드 포맷팅에는 Prettier와 ESLint를 사용합니다:

```bash
# 코드 포맷팅
pnpm format

# 코드 린트
pnpm lint

# 린트 이슈 수정
pnpm lint:fix
```

---

## 커밋 가이드라인

[Conventional Commits](https://www.conventionalcommits.org/)를 따릅니다.

### 커밋 메시지 형식

```
<타입>(<범위>): <제목>

[선택적 본문]

[선택적 푸터]
```

### 타입

| 타입 | 설명 |
|-----|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `style` | 코드 스타일 변경 (포맷팅 등) |
| `refactor` | 코드 리팩토링 |
| `perf` | 성능 개선 |
| `test` | 테스트 추가 또는 수정 |
| `chore` | 빌드 프로세스 또는 보조 도구 변경 |

### 예시

```bash
# 기능
git commit -m "feat(대시보드): 주간 추이 차트 추가"

# 버그 수정
git commit -m "fix(인증): 세션 타임아웃 이슈 해결"

# 문서
git commit -m "docs: API 명세서 업데이트"

# 리팩토링
git commit -m "refactor(훅): useUserInfo 로직 단순화"
```

### 커밋 모범 사례

- 커밋을 원자적으로 유지 (커밋당 하나의 논리적 변경)
- 명확하고 간결한 커밋 메시지 작성
- 커밋에서 이슈 참조: `fix(인증): 로그인 버그 해결 (#123)`

---

## Pull Request 프로세스

### 제출 전

1. **모든 검사 통과 확인:**
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

2. 필요한 경우 **문서 업데이트**

3. 변경사항 **수동 테스트**

### Pull Request 생성

1. 포크에 브랜치를 푸시합니다:
   ```bash
   git push origin feature/your-feature
   ```

2. GitHub에서 Pull Request를 생성합니다

3. PR 템플릿을 작성합니다:

```markdown
## 요약

변경사항에 대한 간략한 설명.

## 변경 내용

- 기능 X 추가
- 버그 Y 수정
- 컴포넌트 Z 업데이트

## 테스트

- [ ] 로컬에서 테스트 완료
- [ ] 모든 타입 검사 통과
- [ ] 모든 린트 검사 통과
- [ ] 빌드 성공

## 스크린샷 (해당하는 경우)

[스크린샷 추가]

## 관련 이슈

Closes #123
```

### PR 리뷰 프로세스

1. 최소 한 명의 메인테이너가 PR을 리뷰합니다
2. 요청된 변경사항을 수정합니다
3. 승인되면 메인테이너가 PR을 머지합니다

### 머지 후

- 기능 브랜치를 삭제합니다
- 포크를 업스트림과 동기화합니다:
  ```bash
  git checkout main
  git fetch upstream
  git merge upstream/main
  git push origin main
  ```

---

## 버그 리포트

### 제출 전

1. 중복을 피하기 위해 기존 이슈를 검색합니다
2. 최신 버전에서도 버그가 존재하는지 확인합니다
3. 관련 정보를 수집합니다

### 버그 리포트 템플릿

```markdown
## 버그 설명

버그에 대한 명확한 설명.

## 재현 단계

1. '...'로 이동
2. '...' 클릭
3. '...'까지 스크롤
4. 오류 확인

## 예상 동작

예상했던 동작.

## 실제 동작

실제로 발생한 동작.

## 스크린샷

[해당하는 경우]

## 환경

- OS: [예: macOS 14.0]
- 브라우저: [예: Chrome 120]
- Node.js: [예: 20.10.0]
- pnpm: [예: 8.15.0]

## 추가 컨텍스트

기타 관련 정보.
```

---

## 기능 제안

### 제출 전

1. 기존 이슈와 토론을 검색합니다
2. 기능이 프로젝트 목표에 맞는지 고려합니다
3. 구현 복잡성을 생각합니다

### 기능 요청 템플릿

```markdown
## 기능 설명

제안하는 기능에 대한 명확한 설명.

## 문제 정의

이 기능이 해결하는 문제는 무엇인가요?

## 제안 솔루션

이 기능이 어떻게 작동해야 하나요?

## 고려한 대안

어떤 대안을 고려했나요?

## 추가 컨텍스트

목업, 예시, 또는 참조.
```

---

## 질문이 있으신가요?

- [GitHub 토론](https://github.com/your-org/debug-recorder-admin/discussions) 열기
- [FAQ](#) 확인 (준비 중)
- 기존 [이슈](https://github.com/your-org/debug-recorder-admin/issues) 검토

---

## 인정

기여자는 다음에서 인정됩니다:
- README.md 기여자 섹션
- 중요한 기여에 대한 릴리스 노트

기여해 주셔서 감사합니다! 🙏
