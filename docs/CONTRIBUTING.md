# 기여 가이드

Remote Debug Tools 프로젝트 기여 가이드입니다.

## 개발 환경 설정

### 필수 요구사항

- Node.js >= 20
- pnpm >= 9
- Docker Desktop (PostgreSQL용)

### 프로젝트 설정

```bash
git clone https://github.com/YOUR_USERNAME/remote-devtools.git
cd remote-devtools
pnpm install

cp .env.example apps/remote-platform-external/src/.env.local
cp .env.example apps/remote-platform-internal/src/.env.local

docker-compose up postgres -d

# 터미널 1: internal (port 3000)
pnpm start:internal:dev

# 터미널 2: external (port 3001)
pnpm start:external:dev
```

## 프로젝트 구조

NestJS 11 모노레포이며 두 개의 앱과 공유 라이브러리로 구성된다.

```
apps/
  remote-platform-internal/   # 내부 플랫폼 (port 3000)
  remote-platform-external/   # 외부 플랫폼 (port 3001)
libs/
  core/         # 공통 서비스 (DB 접근 등)
  entity/       # TypeORM 엔티티 정의
  constants/    # 상수 정의
  interfaces/   # 타입/인터페이스 정의
  common/       # 공통 유틸리티 (필터, 인터셉터 등)
```

경로 별칭은 `@remote-platform/core`, `@remote-platform/entity` 등을 사용한다.

## 코드 스타일

### TypeScript

TypeScript strict mode를 사용한다. `any` 타입 사용을 지양하고 명시적 타입을 선언한다.

```typescript
// 좋은 예: 명시적 타입 선언
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// 나쁜 예: any 타입 사용
function calculateTotal(items: any): any { ... }
```

### 네이밍 컨벤션

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일명 | kebab-case | `image-base64.module.ts`, `user-info.service.ts` |
| 변수, 함수, 프로퍼티 | camelCase | `eventType`, `getUserData` |
| 클래스, 인터페이스 | PascalCase | `UserService`, `NetworkData` |
| 엔티티 클래스 | PascalCase + Entity 접미사 | `RecordEntity`, `DomEntity`, `ScreenEntity` |
| 상수 | UPPER_SNAKE_CASE | `MSG_ID.NETWORK.ENABLE`, `MAX_RETRY_COUNT` |

파일명은 반드시 kebab-case를 사용한다. `imageBase64.module.ts`가 아닌 `image-base64.module.ts`로 작성한다.

### ESLint 및 Prettier

ESLint flat config (`eslint.config.mjs`)를 사용한다.

```bash
# 린트 검사 및 자동 수정
pnpm lint

# 포맷팅 적용
pnpm format
```

### import 순서

```typescript
// 1. 외부 라이브러리
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

// 2. 내부 모듈 (경로 별칭)
import { RecordEntity } from '@remote-platform/entity';

// 3. 상대 경로
import { utils } from './utils';
```

## 테스트

테스트 프레임워크로 Vitest를 사용한다 (Jest가 아님).

```bash
# 전체 테스트 실행
pnpm test

# watch 모드
pnpm test:watch

# 커버리지 포함
pnpm test:cov
```

### 테스트 작성 가이드

- 새 서비스/컨트롤러 추가 시 `.spec.ts` 테스트 파일을 함께 작성한다
- `@nestjs/testing`의 `Test.createTestingModule()`을 사용한다
- TypeORM Repository는 `getRepositoryToken()`으로 목킹한다
- 외부 API(Jira, Slack, Google 등) 호출은 반드시 목킹한다

## CI/CD 파이프라인

GitHub Actions가 저장소의 모든 push/PR에서 자동 실행된다 (`.github/workflows/ci.yml`):

| 단계 | 명령어 | 설명 |
|------|--------|------|
| Lint | `pnpm lint` | ESLint + Prettier 검사 |
| Type Check | `pnpm typecheck` | TypeScript 타입 검사 |
| Test | `pnpm test:cov` | Vitest 테스트 + 커버리지 리포트 |
| SDK checks | `cd sdk && pnpm test:cov && pnpm typecheck` | SDK 타입/테스트 검증 |
| Admin checks | `pnpm --filter debug-recorder-admin lint && pnpm --filter debug-recorder-admin typecheck` | Admin 대시보드 정적 검사 |
| Figma plugin checks | `pnpm --filter figma-plugin lint && pnpm --filter figma-plugin type-check && pnpm --filter figma-plugin build` | Figma 플러그인 정적 검사 + 빌드 |
| Build | `pnpm build:all` + `pnpm --filter debug-recorder-admin build` + 각 앱 빌드 | NestJS/SDK/Client/Admin 빌드 패스 |

### Docker 로컬 테스트

```bash
# PostgreSQL + pgAdmin 실행
docker-compose up -d

# 전체 스택 (앱 포함)
docker-compose up
```

## 보안

보안 관련 설정과 가이드는 [SECURITY.md](./SECURITY.md)를 참고한다.

## 커밋 컨벤션

커밋 메시지 형식은 `type: description`을 따른다.

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 | `feat: add network rewrite feature` |
| `fix` | 버그 수정 | `fix: resolve connection timeout issue` |
| `refactor` | 리팩토링 | `refactor: simplify data processing logic` |
| `chore` | 빌드, 설정, 의존성 변경 | `chore: update dependencies` |
| `docs` | 문서 변경 | `docs: update installation guide` |
| `test` | 테스트 추가/수정 | `test: add unit tests for user service` |

## Pull Request 가이드

### PR 제출 전 체크리스트

- [ ] 타입체크 통과: `pnpm typecheck`
- [ ] 린트 통과: `pnpm lint`
- [ ] 빌드 성공: `pnpm build:all`
- [ ] 테스트 통과: `pnpm test`
- [ ] CI 필수 체크(`CI pass gate`) 통과: GitHub Actions 요약에서 확인
- [ ] `CI pass gate` 결과에 `skipped` 항목이 없는지 확인 (`backend`, `client`, `SDK`, `admin`, `plugin`, `build` 모두 성공)
- [ ] `CodeRabbit review gate` 통과: CodeRabbit이 PR을 `APPROVED` 했는지 확인
- [ ] 파일명이 kebab-case를 따르는지 확인
- [ ] same-repo PR인 경우 `pr-checklist-enforcer` 워크플로우가 통과(체크리스트 완전 체크)하는지 확인 (`failed` 또는 중복 코멘트가 없어야 함)
- [ ] fork PR은 `pr-checklist-enforcer`가 실행되지 않으므로, PR 템플릿 체크리스트와 수동 검토를 함께 수행한다.

### AI 리뷰(CodeRabbit) 체크

- `.coderabbit.yaml`은 모든 PR에서 공통 리뷰 규칙을 적용합니다.
- PR 작성 후 CodeRabbit 앱이 설치되어 있으면 리뷰/요약 코멘트를 자동으로 받습니다.
- `.github/workflows/coderabbit-gate.yml` 워크플로우가 PR의 가장 최근 CodeRabbit 리뷰
  상태를 검증해 `APPROVED` 일 때만 머지 게이트(`CodeRabbit review gate`)를 통과시킵니다.
- 리뷰가 `CHANGES_REQUESTED` 또는 미리뷰 상태이면 머지가 막힙니다. 코멘트를 반영하고
  새 커밋을 푸시하면 CodeRabbit이 재리뷰해 게이트가 다시 녹색으로 전환됩니다.

### 리뷰 프로세스

1. PR 제출 (변경 내용 요약, 관련 이슈 링크 포함)
2. CI 자동 검사
3. 코드 리뷰
4. 피드백 반영 후 승인
5. Squash merge
