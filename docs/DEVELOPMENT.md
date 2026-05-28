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

## PR 체크리스트

- 변경 범위 요약
- 영향 받는 도메인
- 실행한 검증 명령어 및 결과
- 회귀 확인 항목
