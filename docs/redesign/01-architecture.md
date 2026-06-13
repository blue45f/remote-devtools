# Unified Client Redesign — Architecture & Conventions

## 폴더 구조 (feature-sliced, 호스트=client 컨벤션 계승)

기존 `client` 의 `pages / components / lib` 구조에, admin 의 응집형 feature 구조를 흡수해
**feature-sliced** 로 정리한다. 라우트 진입점은 얇은 `pages/*` 래퍼, 도메인 로직은 `features/*`.

```
client/src/
  pages/                # 라우트 진입점(얇은 래퍼). 코드분할 lazy 대상.
    Dashboard.tsx  Sessions.tsx  SessionDetail.tsx
    RemoteDevTools.tsx  GuideFeatures.tsx  GuideUser.tsx  GuideDev.tsx
    SettingsProfile.tsx  SettingsTeam.tsx  Landing.tsx ...
  features/             # 도메인별 응집 모듈 (admin 에서 이식)
    remote-devtools/    api.ts  types.ts  hooks.ts  command-policies.ts  components/*
    profile/            api.ts  types.ts  hooks.ts  components/*
    team/               api.ts  types.ts  hooks.ts  components/*
    guide/              content.ts  components/*
    dashboard/          api.ts  types.ts  hooks.ts  components/*  (운영+어드민 통합)
  components/
    ui/                 # 공유 프리미티브 (Radix + CVA). antd 대체분 추가.
    layout/             # Layout, Sidebar, Topbar, CommandPalette ...
    ...                 # ActivityFeed, Brand 등 기존 공용
  lib/                  # 횡단 유틸: api.ts, store.ts, auth.tsx, i18n.ts, format.ts, nav.ts, roles.ts ...
  locales/              # en.json, ko.json (단일 translation 네임스페이스)
```

> 점진 이행: 기존 `components/Layout.tsx` 등은 `components/layout/` 로 재배치하되 import 경로를
> 갱신한다. 대규모 기존 페이지(Sessions/SessionDetail)는 내부 로직 보존, 셸·내비·칩만 재정비.

## 데이터 계층

- **단일 fetch**: 모든 호출은 `lib/api.ts` 의 `apiFetch<T>(path, init)` 경유. (auth 헤더, `Accept-Language`,
  타임아웃, 데모 모드 단락, 표준 에러 메시지 추출이 이미 내장).
- **서버 상태**: TanStack Query v5. 쿼리키 컨벤션 `['<domain>', '<resource>', ...params]`.
  뮤테이션은 자체 `onError` 처리(전역 토스트는 query 전용).
- **클라 상태**: Zustand `useAppStore` (사이드바/테마/팔레트/데모). 도메인 일시 상태는 컴포넌트 로컬.
- **데모 모드**: 신규 엔드포인트는 `lib/seed-router.ts` + `lib/seed*.ts` 에 seed 추가(120ms 지연 모사).
- antd 의 axios 싱글톤(`shared/api/client.ts`)·`ApiResponse<T>` 래퍼는 폐기하고 `apiFetch` 로 흡수.
  단, 백엔드가 `{ success, data }` 래퍼를 주는 엔드포인트는 feature `api.ts` 에서 언랩한다.

## 인증 · 권한

- `lib/auth.tsx` 의 `AuthProvider` / `useAuth()` 를 그대로 사용(JWT in localStorage, provider-agnostic).
- admin 의 쿠키 세션(Admin BFF) 모델은 폐기 — 통합 앱은 `client` 의 Bearer JWT 모델로 단일화.
- **역할 게이팅**: `lib/roles.ts` 의 `useRole()` 이 `claims.role` 을 반환. `<RequireRole roles={['owner','admin']}>`
  가드로 `/settings/team` 등 보호. 사이드바도 role 로 항목 필터.
- 셀프호스트/데모(=auth 비활성)에서는 모든 역할을 `owner` 로 간주해 전 기능 노출(기존 `RequireAuth` 철학과 일치).

## 라우팅

`main.tsx` 의 단일 `<Routes>` 유지. 공개 라우트는 셸 밖, 앱 라우트는 `RequireAuth + Layout` 중첩.
admin 호환 경로는 `<Navigate replace>` 리다이렉트. 모든 페이지 `lazy()` + `Suspense`.
`nav.ts` 에 섹션/항목/역할/플래그 메타를 추가하고 사이드바·커맨드팔레트·브레드크럼이 공유.

## i18n

단일 `translation` 네임스페이스(`ko` 기본). 기존 top-level 키
(`nav, sidebar, dashboard, sessions, sessionDetail, command, ...`) 에
`remoteDevtools, profile, team, guide, settings` 를 **추가**(admin 의 ko/en.json 키를 통합·정규화).

## 빌드 · 코드분할

`vite.config.ts` 의 proxy/manualChunks 유지. admin 전용 청크(recharts 등)는 기존 규칙에 흡수.
`react-syntax-highlighter`(가이드/Raw) 대신 경량 자체 하이라이트 또는 `<pre>` + 토큰 클래스로 대체해
의존성을 늘리지 않는다(현 client 컨벤션: 검증된 라이브러리 우선이되 불필요 추가 지양).
차트는 `recharts` 를 client 에 도입(대시보드 트렌드). admin 이 이미 쓰던 검증 라이브러리이며 CLAUDE.md 표에 등재됨.

## 테스트

Vitest + Testing Library + jsdom. `src/test/setup.ts`(i18n=en, matchMedia/ResizeObserver 폴리필) 재사용.
신규 feature 의 핵심(권한 게이팅, 커맨드 정책, 폼 검증, 페이지 렌더)에 단위 테스트 추가.
데모 모드 seed 로 백엔드 없이 페이지 렌더 검증.
