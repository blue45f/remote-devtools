# Handoff — 통합 마무리 (Mac에서 실행)

이 샌드박스(리눅스, bash 45초 제한 + `.git`/`node_modules` 마운트 쓰기 제약)에서는
설치·테스트·빌드·git 커밋·푸시·배포가 **구조적으로 불가**합니다. 아래 명령을 사용자 Mac에서
그대로 실행하면 끝납니다. 코드 변경은 워킹 트리에 모두 반영돼 있고, 정적 검증
(클라이언트 `tsc` 0, 백엔드 `tsc` 0, 신규 코드 `eslint` 0)은 통과 확인했습니다.

## 1) 의존성 복구 + 검증

```bash
cd ~/WebstormProjects/remote-devtools
pnpm install                     # node_modules 복구 + admin 패키지 제거 반영 (lockfile은 이미 정리됨)
pnpm typecheck                   # 백엔드 + 루트
pnpm lint
cd client && pnpm typecheck && pnpm test && pnpm build && cd ..
```

> 참고: `pnpm-lock.yaml`은 이미 admin 패키지를 제거한 상태로 재생성해 뒀습니다
> (`--frozen-lockfile` CI 통과 가능). 폴더 `debug-recorder-admin/`도 이미 삭제됨.

## 2) 커밋 (브랜치는 `feat/unify-admin-into-client` 권장)

```bash
git checkout -b feat/unify-admin-into-client   # 이미 있으면 생략
git add -A
git commit -F - <<'MSG'
feat(client): unify debug-recorder-admin into the client app

Fold the separate antd-based admin app into the unified Vite + React 19
client. All admin features re-implemented on the client's Tailwind 4 + Radix
design system (zero antd, zero new runtime deps).

Frontend
- New routes under the shared shell: /remote-devtools (live CDP console),
  /settings/profile (devices + ticket templates), /settings/team (org members),
  /guide, /guide/user, /guide/dev. Legacy admin paths redirect.
- Feature modules: client/src/features/{remote-devtools,profile,team,guide}
  (api + types + hooks + components).
- 18 new UI primitives in components/ui (table, data-table, switch, checkbox,
  field, alert, stat, segmented, status-dot, steps, collapsible, tag-input,
  code-block, pagination, textarea, label).
- Role-gated nav (lib/roles.ts + RequireRole) and feature flags (lib/config.ts).
- i18n (ko/en) and demo-mode seeds for every new surface.

Backend (NestJS)
- New remote-devtools module (controller/service/dto) adapting records +
  runtime events into the console's session/event/command shape; registered
  in AppModule.

Cleanup
- Remove debug-recorder-admin/ and all workspace/CI/sonar/coderabbit/PR
  references; regenerate pnpm-lock.yaml; update CLAUDE.md/README.
- Docs: docs/redesign/* (overview, architecture, design-system, migration).

Verification: client tsc 0, root/backend tsc 0, eslint 0 on new code.
Run `pnpm install && pnpm typecheck && cd client && pnpm test && pnpm build`.
MSG
git push -u origin feat/unify-admin-into-client
```

## 3) PR 본문 (복붙용)

```markdown
## 변경 범위
debug-recorder-admin(antd) 앱을 통합 client(Vite+React19, Tailwind4+Radix)로 흡수.

## 영향 받는 도메인
client(라우팅/셸/디자인시스템/features), 백엔드 internal(remote-devtools 모듈), CI/워크스페이스/문서.

## 주요 변경
- 통합 라우팅·역할 게이팅·기능플래그·i18n·데모 seed
- features/{remote-devtools,profile,team,guide} 재구현 (antd→Radix/Tailwind)
- components/ui 프리미티브 18종 추가 (신규 의존성 0)
- NestJS remote-devtools 모듈 신설
- debug-recorder-admin 폴더 및 전 참조 제거, lockfile 재생성

## 실행한 검증
- client `tsc` 0, root/backend `tsc` 0, 신규 코드 `eslint` 0
- (로컬) `pnpm install && pnpm typecheck && cd client && pnpm test && pnpm build`

## 회귀 확인
- 레거시 admin 경로 리다이렉트(/user-info→/settings/profile 등)
- 데모 모드 전 라우트 렌더
- 역할 게이팅(viewer는 /settings/team 차단)
```

## 4) 배포
- 프론트(Vercel) + 백엔드(Render)는 `docs/DEPLOYMENT.md` 기준. main 머지 시 자동 배포.
- 배포 전 위 검증 그린 확인.
