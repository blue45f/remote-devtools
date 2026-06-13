# Unified Client Redesign — Overview

> 목적: 두 개로 갈라진 프론트엔드(`client/` 운영 콘솔 + `debug-recorder-admin/` 어드민)를
> **하나의 Vite + React 19 앱(`client/`)** 으로 통합한다. 디자인 시스템은 `client` 기준
> **Tailwind 4 + Radix** 로 통일하고, antd 의존은 완전히 제거한다. 백엔드는 NestJS 그대로 두되
> 통합 콘솔이 필요로 하는 엔드포인트만 NestJS 컨벤션으로 보강한다.

## North Star

PRODUCT.md / DESIGN.md 의 "The Operator's Console" 원칙을 그대로 계승한다: 신호 우선,
색은 정보, 밀도는 기능, 보고하되 과시하지 않음. 어드민 화면도 같은 모노크롬 계기판 언어로
통일해 "운영 콘솔 안의 관리 도구" 처럼 느껴지게 한다 — 별도 제품처럼 보이지 않게.

## 통합 목표

1. **단일 앱·단일 셸** — 사이드바/탑바/커맨드팔레트/테마/i18n 를 한 번만 구현하고 모든 화면이 공유.
2. **단일 디자인 시스템** — `components/ui/*` (Radix + CVA + Tailwind 토큰). antd 0 의존.
3. **기능 완전 이식** — admin 의 auth(session)·user(profile/devices/templates)·dashboard·guide·remoteDevtools 를 100% 재구현.
4. **역할 기반 노출** — `auth.tsx` 의 `claims.role`(owner/admin/member/viewer) 로 어드민 영역 게이팅.
5. **데모 모드 유지** — 신규 엔드포인트도 seed-router 에 추가해 오프라인 데모가 깨지지 않게.
6. **레거시 제거** — 이식 완료 후 `debug-recorder-admin/` 폴더와 모든 참조(workspace/turbo/CI/docker/nginx/docs)를 삭제.

## 통합 정보구조 (IA)

| 영역 | 라우트 | 화면 | 접근 |
| --- | --- | --- | --- |
| 공개 | `/` | Landing | public |
| 공개 | `/pricing` | Pricing | public |
| 공개 | `/sign-in`, `/sign-up` | 인증 | public |
| 공개 | `/terms`, `/privacy` | 약관/개인정보 | public |
| 운영 | `/dashboard` | 대시보드(운영 지표 + 티켓/녹화 트렌드 viewMode) | 인증 |
| 운영 | `/sessions`, `/sessions/:id` | 세션 목록/상세(Replay·Timeline·Network·Console·Raw) | 인증 |
| 운영 | `/remote-devtools` | 원격 CDP 라이브 콘솔(세션·이벤트·커맨드) | 인증 + feature flag |
| SDK | `/sandbox/module`, `/sandbox/script` | SDK 샌드박스 | 인증 |
| 가이드 | `/guide` | 기능 소개(Feature Intro) | 인증 |
| 가이드 | `/guide/user` | 사용자 가이드(탭형 스텝) | 인증 |
| 가이드 | `/guide/dev` | 개발자 가이드 | 인증 |
| 설정 | `/settings/profile` | 내 정보(직군·디바이스·티켓 템플릿) | 인증 |
| 설정 | `/settings/team` | 팀/조직 멤버 관리 | owner·admin |
| — | `*` | NotFound | 인증 |

기존 admin 라우트는 호환 리다이렉트로 보존한다:
`/user-info → /settings/profile`, `/feature-introduction → /guide`, `/user-guide → /guide/user`,
`/dev-guide → /guide/dev`, `/remote-devtools` 는 동일 경로 유지.

## 사이드바 구성

```
운영          Dashboard · Sessions · Remote DevTools(flag)
SDK 실험실    Module SDK · Script SDK
가이드        기능 소개 · 사용자 가이드 · 개발자 가이드
설정          내 정보 · 팀 관리(role-gated)
```

## 산출물 단계

1. 설계 문서(`docs/redesign/*`) — 본 묶음.
2. 통합 셸·디자인시스템·라우팅·신규 UI 프리미티브.
3. 어드민 기능 이식(antd → Radix/Tailwind) + 대시보드 viewMode 확장.
4. 기존 페이지의 신규 셸 통합 + 칩/브레드크럼/내비 재정비.
5. 백엔드 `remote-devtools` NestJS 모듈 보강.
6. 레거시 제거.
7. 검증(typecheck·lint·test·build).
