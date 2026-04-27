# CLAUDE.md

## Project Overview

Remote DevTools — Chrome DevTools Protocol 기반 원격 디버깅 플랫폼.
NestJS 11 모노레포 + React 19 클라이언트 + TypeScript SDK.

## Quick Start

```bash
pnpm install
docker-compose up postgres -d
pnpm start:internal:dev   # port 3000
pnpm start:external:dev   # port 3001
cd client && pnpm dev     # port 8080
```

### Without Docker (embedded-postgres)

`scripts/start-pg.mjs` boots a portable Postgres 18 cluster under `~/.cache/remote-devtools-pg` using the `embedded-postgres` npm package — no sudo, no Docker. Useful in CI environments and machines without Docker Desktop.

```bash
node scripts/start-pg.mjs    # foreground, Ctrl+C to stop
pnpm start:internal:dev      # in another terminal
pnpm start:external:dev      # in another terminal
cd sdk && pnpm build         # one-shot, lets external serve /sdk/index.umd.js
cd client && pnpm dev        # Vite dev server with proxy to backends
```

## Architecture

### Backend
- `apps/remote-platform-internal` (port 3000): DevTools UI, session replay APIs, dashboard, admin
- `apps/remote-platform-external` (port 3001): SDK serving, CDP data collection, Jira/Slack
- `libs/core`: shared DB services (Record, Network, DOM, Screen, Runtime, S3)
- `libs/entity`: TypeORM entities with indexes
- `libs/common`: exception filters, interceptors, error codes
- `libs/constants`: shared constants, timezone utilities

### Frontend (`client/`)
- React 19 + Vite 6 + TanStack Query v5 + Zustand + Tailwind CSS 4
- Path alias: `@/` → `client/src`
- Layout: `src/components/Layout.tsx` (sidebar + topbar + Cmd+K palette)
- Design system: `src/components/ui/*` (shadcn-style primitives on Radix UI)
- Design tokens: `src/index.css` (`@theme inline` mapping CSS vars to Tailwind utility names)

### Vite dev proxy (`client/vite.config.ts`)

In dev, the client runs on `localhost:8080` while backends serve their APIs on 3000/3001 with helmet's `Cross-Origin-Resource-Policy: same-origin`. The Vite server proxies to bypass CORP:

| path | target | notes |
|------|--------|-------|
| `/sdk` | external 3001 | UMD/ESM SDK bundle |
| `/buffer` | external 3001 | SDK beacon endpoint |
| `/api` | internal 3000 | session-replay, dashboard, activity |
| `/sessions` | internal 3000 | sessions CRUD, **with `bypass(req)` for `Accept: text/html`** so the SPA route also named `/sessions` still serves `index.html` |
| `/socket.io` | external 3001 | gateway WebSocket |

When adding a new backend route the frontend needs to call, mirror it here.

### Routes
- `/dashboard` — overview metrics, charts, real-time activity feed
- `/sessions` — recorded + live debugging sessions
- `/sessions/:id` — session detail with **Overview / Replay / Timeline / Raw JSON** tabs
- `/sandbox/module` — SDK demo loaded via ESM dynamic import
- `/sandbox/script` — SDK demo loaded via UMD script tag
- `/` redirects to `/dashboard`; `/test` redirects to `/sandbox/script` (legacy)

### Replay event normalisation

`/api/session-replay/sessions/:id/events` returns rows in the shape
`{ id, eventType, protocol: { type, data, timestamp }, isRRWeb }` (CDP envelope), but rrweb-player and the Timeline UI expect flat `{ type, timestamp, data }`. The `normaliseEvent()` helper in `client/src/pages/SessionDetail.tsx` collapses both shapes — keep that adapter when changing either side.

### SDK (`sdk/`)
Browser instrumentation SDK shipped as both UMD and ESM. Loaded by sandbox pages and any customer site that imports `remote-debug-sdk`.

## Demo Mode

The client supports an offline demo mode that short-circuits `apiFetch` to seed data — useful for design previews and tests.

- Toggle via Cmd+K → "Enable demo mode" or `localStorage["demo-mode"] = "1"`
- Topbar shows a `Demo` badge while active
- Seeds: `src/lib/seed.ts` (sessions, dashboard) + `src/lib/seed-rrweb.ts` (rrweb fixture)
- Routing of seed responses: `src/lib/seed-router.ts`
- Vitest tests rely on demo mode to render pages without a backend

## Key Commands

```bash
# Backend (run from repo root)
pnpm test          # Vitest backend suite
pnpm test:cov      # with v8 coverage
pnpm lint          # ESLint flat config
pnpm typecheck     # tsc --noEmit
pnpm build:all     # NestJS build both servers

# Frontend (run inside client/)
pnpm dev           # Vite dev server (port 8080)
pnpm build         # production build
pnpm typecheck     # tsc --noEmit
pnpm test          # Vitest + Testing Library + jsdom
pnpm test:cov      # with v8 coverage
```

## Tech Stack

- **Backend**: NestJS 11, TypeORM, PostgreSQL, helmet, `@nestjs/throttler`, `@nestjs/swagger`, `@nestjs/terminus`
- **Frontend**:
  - React 19, Vite 6, TanStack Query v5, Zustand
  - Tailwind CSS 4 (via `@tailwindcss/vite`)
  - Radix UI primitives, cmdk (command palette), framer-motion (motion), lucide-react (icons), sonner (toasts)
  - Recharts (charts), rrweb-player (session replay)
- **Testing**: Vitest (backend + frontend), Testing Library + jsdom (frontend)
- **CI/CD**: GitHub Actions (lint, typecheck, test, build)
- **Infra**: Docker multi-stage (non-root), PM2, nginx

## Conventions

### Backend
- File naming: kebab-case (`user-profile.service.ts`)
- Path aliases: `@remote-platform/core`, `@remote-platform/entity`, `@remote-platform/common`, `@remote-platform/constants`
- Error handling: use `BusinessException` or NestJS built-in exceptions, never generic `Error`
- Validation: class-validator DTOs with `ValidationPipe`
- Logging: NestJS `Logger` (never `console.log`)
- Timezone: use `getLocalDateString()` from `@remote-platform/constants` (never manual KST offset)
- Cache: use `lru-cache` for in-memory caching
- Retry: use `p-retry` for retry logic
- HTML escaping: use `escape-html` package

### Frontend
- File naming: kebab-case for primitives (`empty-state.tsx`), PascalCase for composed components and pages (`Sidebar.tsx`, `Dashboard.tsx`)
- Imports: use `@/` alias instead of relative paths beyond a single level
- Icons: import from `lucide-react`; never inline raw SVG for nav/UI affordances
- Colors: use design tokens (`bg-bg`, `text-fg`, `border-border`, `bg-accent-soft`, etc.) — do not reach for raw Tailwind palette names (`slate-*`, `violet-*`, …)
- Status terminology:
  - `recordMode` (boolean) — data field
  - `isLive` / `isRecording` — boolean component props
  - `Recorded` (past) vs `Recording` (present) — UI labels
- API access: always go through `apiFetch` from `@/lib/api`. Honour demo mode by adding seed responses in `seed-router.ts`.
- State: Zustand store at `@/lib/store` for shared UI state (sidebar, theme, command palette, demo mode); component-local state otherwise.

## API Documentation

- Swagger UI: `http://localhost:3000/api/docs` (internal), `http://localhost:3001/api/docs` (external)
- Health check: `GET /api/health` (Terminus with DB ping)
