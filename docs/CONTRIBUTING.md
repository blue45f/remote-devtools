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
- [ ] 파일명이 kebab-case를 따르는지 확인

### 리뷰 프로세스

1. PR 제출 (변경 내용 요약, 관련 이슈 링크 포함)
2. CI 자동 검사
3. 코드 리뷰
4. 피드백 반영 후 승인
5. Squash merge
