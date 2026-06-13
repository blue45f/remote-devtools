# Unified Client Redesign — Migration & Cleanup Plan

## 어드민 기능 → 통합 앱 매핑

| admin feature | 통합 위치 | 라우트 | 백엔드 계약 | 데모 seed |
| --- | --- | --- | --- | --- |
| `auth`(session/logout) | `lib/auth.tsx`(기존) 로 흡수. 쿠키세션→Bearer JWT 단일화 | — | `/api/auth/status`, `/api/auth/login` | 기존 |
| `user`(profile/devices/templates) | `features/profile/*` → `pages/SettingsProfile.tsx` | `/settings/profile` | `GET/PUT /api/user-profile/:empNo`, `GET /workflow/members`, `GET /api/google-sheets/read-tc-sheet` | 신규 |
| `dashboard`(stats/trend) | `features/dashboard/*` (운영 대시보드와 통합, viewMode) | `/dashboard` | `GET /api/dashboard/stats`, `/tickets/trend`, `/record-sessions/trend` | 기존+확장 |
| `guide`(feature/user/dev) | `features/guide/*` → `pages/Guide*.tsx` | `/guide`, `/guide/user`, `/guide/dev` | 정적 콘텐츠 | 불필요 |
| `remoteDevtools` | `features/remote-devtools/*` → `pages/RemoteDevTools.tsx` | `/remote-devtools` | `GET /api/remote-devtools/sessions`, `/sessions/:id/events`, `POST /sessions/:id/commands`, `POST /sessions` | 신규 |
| 조직 멤버 관리(신규 노출) | `features/team/*` → `pages/SettingsTeam.tsx` | `/settings/team` | `GET/POST/PATCH/DELETE /api/accounts/organization/members` | 신규 |

## 백엔드(NestJS) 보강

백엔드에 `remote-devtools` 모듈이 없음 → `apps/remote-platform-internal/src/modules/remote-devtools/`
에 NestJS 모듈 신설(기존 컨벤션: controller/service/dto, `BusinessException`, `@ApiTags`, Logger).
라이브 룸(webview gateway)·세션 메타·replay 이벤트를 `RemoteDevToolsSession`/`RemoteDevToolsEvent`
형태로 어댑트. 커맨드(start/pause/resume/replay/disconnect/collect)는 buffer-save 등 기존 동작에 연결,
미지원 커맨드는 표준 ack 반환. `AppModule` 에 등록. AuthGuard 는 다른 보호 라우트와 동일 정책.

## 레거시 제거 체크리스트 (이식·검증 완료 후)

- [ ] `debug-recorder-admin/` 디렉터리 삭제
- [ ] `pnpm-workspace.yaml` 에서 admin 패키지 제거
- [ ] 루트 `package.json` 스크립트(`dev:admin`,`build:admin`,`typecheck:admin`,`lint:admin`,
      `build:react` 의 `--filter debug-recorder-admin`)·`files` 의 `debug-recorder-admin/dist` 제거
- [ ] `turbo.json` / `vercel.json` / `render.yaml` / `Dockerfile` / `docker-compose*.yml` / `nginx.conf`
      의 admin 빌드·서빙·라우팅 참조 제거
- [ ] `.github/`(CI) 의 admin 매트릭스/스텝 제거
- [ ] `sonar-project.properties` 의 admin 경로 제거
- [ ] 루트 문서(README/CLAUDE.md/DESIGN 등)의 admin 언급 갱신
- [ ] 미사용이 된 admin 전용 의존성 정리(필요 시)

## 검증 게이트 (docs/DEVELOPMENT.md)

`pnpm typecheck` · `pnpm lint` · `client` `pnpm test` · `pnpm build:react`(혹은 client build) 통과.
데모 모드로 전 라우트 스모크 렌더. 역할 게이팅/커맨드 정책 단위 테스트.

## 실행 상태 (이번 통합 작업)

완료:
- 어드민 기능 5종 이식(remote-devtools·profile·team·guide·대시보드 viewMode 키), 신규 UI 프리미티브 18종, 라우팅·역할 게이팅·i18n(ko/en)·데모 seed.
- 백엔드 NestJS `remote-devtools` 모듈 신설 + `AppModule` 등록.
- 워크스페이스/패키지/CI/sonar/coderabbit/PR 템플릿/CLAUDE/README 의 admin 참조 제거.
- 검증: 클라이언트 `tsc --noEmit` 0, 루트(백엔드) `tsc --noEmit` 0, 신규 코드 `eslint` 0.

남은 수동 단계 (개발자 머신에서):
- `debug-recorder-admin/` 폴더 물리 삭제 + lockfile 갱신 →
  `bash scripts/remove-legacy-admin.sh` (Cowork 샌드박스는 마운트 권한상 폴더 삭제 불가).
- `pnpm install` 후 `pnpm typecheck && cd client && pnpm test && pnpm build` 로 런타임 검증
  (테스트/빌드는 플랫폼별 rolldown 네이티브 바인딩이 필요해 로컬 실행 권장).
- 잔여 정보성 문서 언급(`docs/ARCHITECTURE.md`·`CICD.md`·`DEPLOYMENT.md`·`INSTALLATION.md`·
  `SECURITY.md`·`CONTRIBUTING.md`·`FOLLOWUPS.md`)은 빌드와 무관하므로 필요 시 일괄 갱신.
