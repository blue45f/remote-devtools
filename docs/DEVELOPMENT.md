# remote-devtools Development Guide

## 개요

이 프로젝트는 아키텍처 문서 정합성, 코드 변경 범위, CI 게이트를 함께 관리합니다.

## 필수 검증 흐름

- 아키텍처 문서 점검을 선행합니다.
- 타입/린트/테스트/빌드 검증을 완료합니다.
- PR 병합 전 증적을 남깁니다.

## 최소 실행 커맨드

- `pnpm run build`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run verify`
- `pnpm run ci`

## 아키텍처 변경 규칙

1. 도메인 경계와 공유 타입 계약 변경은 `docs/ARCHITECTURE.md`에서 먼저 반영합니다.
2. 계약 변경이 API/스키마에 영향을 주면 문서와 테스트 계획을 함께 갱신합니다.
3. `pnpm run verify`는 `validate:architecture`가 선행된 상태여야 합니다.

## 보안 경계 (CORS)

- external 서버의 CORS origin 허용 로직은 `libs/common/src/security/cors-origin.ts`
  의 순수 함수(`createCorsOriginValidator` / `isOriginAllowed`)로 분리되어 있고
  `cors-origin.spec.ts`로 단위 테스트됩니다. `main.ts`에 인라인 클로저로 다시
  넣지 말고 이 헬퍼를 사용하세요.
- `CORS_ALLOWED_ORIGINS`는 apex 도메인을 쉼표로 나열하며, 각 도메인의 **서브도메인**
  (http/https, path 없음)과 `localhost`만 허용합니다. apex 자체는 매칭되지 않습니다.
- 허용 규칙을 바꾸면 반드시 `cors-origin.spec.ts`를 함께 갱신합니다.

## 배포

- 전체 배포(프론트 Vercel + 백엔드 Render/Docker)는 `docs/DEPLOYMENT.md`를 단일
  기준으로 삼습니다. 백엔드 매니지드 호스트 블루프린트는 `render.yaml`입니다.

## PR 체크리스트

- 변경 범위 요약
- 영향 받는 도메인
- 실행한 검증 명령어 및 결과
- 회귀 확인 항목
