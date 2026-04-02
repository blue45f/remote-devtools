# CLAUDE.md

## Project Overview

Remote DevTools - Chrome DevTools Protocol 기반 원격 디버깅 플랫폼.
NestJS 11 모노레포 + React 19 클라이언트 + TypeScript SDK.

## Quick Start

```bash
pnpm install
docker-compose up postgres -d
pnpm start:internal:dev   # port 3000
pnpm start:external:dev   # port 3001
cd client && pnpm dev      # port 8080
```

## Architecture

- `apps/remote-platform-internal` (port 3000): DevTools UI, session replay, dashboard, admin
- `apps/remote-platform-external` (port 3001): SDK serving, CDP data collection, Jira/Slack
- `libs/core`: shared DB services (Record, Network, DOM, Screen, Runtime, S3)
- `libs/entity`: TypeORM entities with indexes
- `libs/common`: exception filters, interceptors, error codes
- `libs/constants`: shared constants, timezone utilities
- `client/`: React 19 + Vite + TanStack Query + Zustand + Tailwind CSS 4
- `sdk/`: browser instrumentation SDK (UMD + ESM)

## Key Commands

```bash
pnpm test          # Vitest (39 files, 311+ tests)
pnpm test:cov      # with v8 coverage
pnpm lint          # ESLint flat config
pnpm typecheck     # tsc --noEmit
pnpm build:all     # NestJS build both servers
```

## Tech Stack

- Backend: NestJS 11, TypeORM, PostgreSQL, helmet, @nestjs/throttler, @nestjs/swagger, @nestjs/terminus
- Frontend: React 19, Vite 6, TanStack Query v5, Zustand, Tailwind CSS 4, Recharts
- Testing: Vitest, @nestjs/testing
- CI/CD: GitHub Actions (lint, typecheck, test, build)
- Infra: Docker multi-stage (non-root), PM2, nginx

## Conventions

- File naming: kebab-case (`user-profile.service.ts`)
- Path aliases: `@remote-platform/core`, `@remote-platform/entity`, `@remote-platform/common`, `@remote-platform/constants`
- Error handling: use `BusinessException` or NestJS built-in exceptions, never generic `Error`
- Validation: class-validator DTOs with `ValidationPipe`
- Logging: NestJS `Logger` (never `console.log`)
- Timezone: use `getLocalDateString()` from `@remote-platform/constants` (never manual KST offset)
- Cache: use `lru-cache` for in-memory caching
- Retry: use `p-retry` for retry logic
- HTML escaping: use `escape-html` package

## API Documentation

- Swagger UI: `http://localhost:3000/api/docs` (internal), `http://localhost:3001/api/docs` (external)
- Health check: `GET /api/health` (Terminus with DB ping)
