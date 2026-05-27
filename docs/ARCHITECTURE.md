# Remote Devtools Architecture

이 문서는 `remote-devtools` 저장소의 주요 애플리케이션과 패키지 경계를 설명합니다. 저장소는 NestJS 기반 원격 디버깅 플랫폼, React 클라이언트, SDK, 관리자 앱, Figma 플러그인을 함께 관리하는 pnpm workspace입니다.

## 설계 원칙

1. **런타임과 UI 분리** - NestJS 서비스는 `apps/`와 `libs/`에서 관리하고, 브라우저 UI는 `client/`, 관리자 UI는 `debug-recorder-admin/`에서 관리합니다.
2. **SDK 독립성 유지** - 외부 소비자가 쓰는 SDK는 `sdk/`에서 별도 빌드/타입 검증이 가능해야 합니다.
3. **플랫폼 공통 코어 유지** - 도메인 모델, 엔티티, 공통 타입, 상수는 `libs/` 아래 패키지로 공유합니다.
4. **검증 명령 표준화** - 루트 `verify`는 format, lint, typecheck, test, backend build를 포함하는 기본 품질 게이트입니다.

## Workspace 구조

```text
apps/
├── remote-platform-internal/   내부 API 애플리케이션
└── remote-platform-external/   외부 API 애플리케이션
libs/
├── common/                     공통 유틸리티
├── constants/                  런타임 상수
├── core/                       핵심 도메인 로직
├── entity/                     TypeORM 엔티티
└── interfaces/                 공유 인터페이스
client/                         React 클라이언트
debug-recorder-admin/           관리자 프론트엔드
sdk/                            외부 연동 SDK
figma-plugin/                   Figma 플러그인
devtools-frontend/              브라우저 DevTools 프론트엔드 자산
```

## 품질 게이트

| 명령 | 목적 |
| --- | --- |
| `pnpm run ci` | format, lint, typecheck, test, backend build |
| `pnpm run verify` | 루트 CI 진입점 |
| `pnpm run build:all` | internal/external NestJS 앱 빌드 |
| `pnpm run test:cov` | Vitest coverage |

## 확장 규칙

새 런타임 기능은 먼저 `libs/core` 또는 도메인별 `libs/*`에 위치시키고, API 노출은 `apps/remote-platform-*`에서 조립합니다. UI 전용 기능은 `client`나 `debug-recorder-admin` 내부에 머물게 하며, 외부 소비자에게 필요한 타입/클라이언트만 `sdk`로 승격합니다.

CI에 새 검증 범위를 추가할 때는 루트 `verify` 또는 기존 GitHub Actions job에 연결해 PR에서 누락되지 않게 합니다.
