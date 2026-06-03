# Deployment

Complete, end-to-end deployment guide for Remote DevTools. This is the
single source of truth that ties together every tier; the older topic-specific
guides ([`DEPLOY_DEMO.md`](./DEPLOY_DEMO.md) for the Vercel demo,
[`SELF_HOSTING.md`](./SELF_HOSTING.md) for Docker self-hosting,
[`CICD.md`](./CICD.md) for the GitHub Actions gates) remain valid and are
referenced where relevant.

## 1. Architecture — which tier goes where

Remote DevTools is a **full-stack monorepo**, not a single deployable. It splits
into a static frontend and two long-running NestJS backend services plus a
database:

| Tier                      | Package                                     | Runtime                  | Target host                                                          | Config in git                                          |
| ------------------------- | ------------------------------------------- | ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------ |
| **Frontend (SPA / demo)** | `client/`                                   | Static Vite build        | **Vercel**                                                           | `vercel.json`, `.github/workflows/deploy-vercel.yml`   |
| **Backend — internal**    | `apps/remote-platform-internal` (port 3000) | NestJS 11 (Node 22)      | **Render** (Docker) or self-host                                     | `Dockerfile`, `render.yaml`, `docker-compose.prod.yml` |
| **Backend — external**    | `apps/remote-platform-external` (port 3001) | NestJS 11 (Node 22)      | **Render** (Docker) or self-host                                     | `Dockerfile`, `render.yaml`, `docker-compose.prod.yml` |
| **Database**              | —                                           | PostgreSQL 15            | Render managed PG / self-host PG                                     | `render.yaml`, `docker-compose.prod.yml`               |
| **SDK**                   | `sdk/`                                      | Browser UMD + ESM bundle | Served by `external` at `/sdk/index.umd.js`; also publishable to npm | `sdk/package.json`                                     |
| **Admin UI**              | `debug-recorder-admin/`                     | Static Vite build        | Bundled / hosted alongside backend                                   | `debug-recorder-admin/`                                |
| **Figma plugin**          | `figma-plugin/`                             | Figma plugin bundle      | Figma plugin store (manual)                                          | `figma-plugin/`                                        |

```
                         ┌─────────────── Vercel (static) ───────────────┐
Browser (operator) ──────▶ client/  (SPA, demo mode: VITE_FORCE_DEMO=true) │
                         └────────────────────────────────────────────────┘

Browser (your customer site)
   │ SDK (UMD or ESM)  →  WebSocket + HTTP
   ▼
external (3001) ── persists CDP events ──┐
                                         ▼
                                   PostgreSQL 15
                                         ▲
internal  (3000) ── reads sessions ──────┘
   │ DevTools UI, dashboard API, replay player, admin
   ▼
Operator
```

**Two deploy paths for the backend** — pick one:

- **Managed host (Render)** — `render.yaml` Blueprint provisions both NestJS
  services + a managed Postgres. Lowest-ops. Described in §3.
- **Self-host (Docker Compose)** — `docker-compose.prod.yml` runs internal +
  external + Postgres + nginx on one box. Described in §4 and in
  [`SELF_HOSTING.md`](./SELF_HOSTING.md).

The frontend (§2) deploys independently of the backend on every path.

---

## 2. Frontend — Vercel (static demo)

The `client/` SPA ships as a static build. The default Vercel build sets
`VITE_FORCE_DEMO=true`, so the public site runs entirely on seed data with **no
backend** — useful as a marketing/demo site. To point a build at a real backend,
remove that env and set `VITE_INTERNAL_HOST` / `VITE_EXTERNAL_HOST` (+ the `*_WS`
variants) instead.

### Build & output (from `vercel.json`)

```bash
# buildCommand   (run by Vercel)
pnpm install --frozen-lockfile && pnpm --filter client build
# outputDirectory
client/dist
```

`vercel.json` also defines SPA rewrites (everything → `/index.html` except
`assets/`, `favicon`, `og-image`, `robots`, `sitemap`, `manifest`), 1-year
immutable caching for `/assets/*`, and security headers (`X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

### Two ways to deploy

**A. GitHub Actions (CI-driven)** — `.github/workflows/deploy-vercel.yml`

- Triggers: `workflow_dispatch` (manual), or automatically via `workflow_run`
  after the **CI** workflow succeeds on `main`.
- The job runs `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod`.
- **It hard-fails fast if secrets are missing** ("Validate deployment secrets"
  step) — so a fork or a freshly-cloned repo without secrets does not silently
  push a broken deploy. This is the canonical "skips/fails cleanly without
  secrets" pattern that `render.yaml` mirrors for the backend.

**B. Local CLI** — see [`DEPLOY_DEMO.md`](./DEPLOY_DEMO.md):

```bash
cd client
vercel login && vercel link     # one-time
vercel                          # preview deploy (transient URL)
vercel --prod                   # production deploy (stable URL)
```

### Required GitHub secrets (Settings → Environments → `production`)

| Secret              | Where to get it                                   |
| ------------------- | ------------------------------------------------- |
| `VERCEL_TOKEN`      | https://vercel.com/account/tokens (account scope) |
| `VERCEL_ORG_ID`     | `.vercel/project.json` after `vercel link`        |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `vercel link`        |

### Preview vs production

|         | Preview                                    | Production                                                 |
| ------- | ------------------------------------------ | ---------------------------------------------------------- |
| Trigger | `vercel` (no `--prod`); Vercel PR previews | `vercel --prod`; CI `workflow_run` on `main`               |
| URL     | transient per-deploy URL                   | stable project URL (`https://remote-devtools.vercel.app/`) |
| Data    | demo seed (same build env)                 | demo seed (same build env)                                 |

### Manual dashboard steps (one-time)

1. `vercel link` the `client/` directory to a Vercel project (or import the repo
   in the dashboard with root = `client`, framework = Vite).
2. Add `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` as GitHub
   environment secrets under the `production` environment.
3. (Optional) add a custom domain: `vercel domains add demo.your-domain.com`.

---

## 3. Backend — managed host (Render)

`render.yaml` is a Render **Blueprint** that provisions, from this repo:

- `remote-devtools-internal` — Docker web service, `node dist/apps/remote-platform-internal/main.js`, port `3000`, health check `GET /api/health`.
- `remote-devtools-external` — Docker web service, `node dist/apps/remote-platform-external/main.js`, port `3001`, health check `GET /api/health`.
- `remote-devtools-pg` — managed PostgreSQL 15; its host/port/user/password/name
  are injected into both services via `fromDatabase`.

Both services build from the same multi-stage `Dockerfile` (Node 22, non-root
`appuser`, Playwright Chromium installed) and differ only by `dockerCommand` +
the `APP` env var.

### Build & start commands

The image is built by Render from `Dockerfile`:

```dockerfile
# builder: pnpm install --frozen-lockfile && pnpm build:all
# runtime: each service overrides CMD via render.yaml dockerCommand:
node dist/apps/remote-platform-internal/main.js   # internal
node dist/apps/remote-platform-external/main.js   # external
```

`process.env.PORT` is honoured by both `main.ts` files (`app.listen(process.env.PORT || 300x)`).

### "Skips without secrets" pattern

Every secret in `render.yaml` is `sync: false`. Render imports the blueprint but
leaves those values **blank** until you fill them in the dashboard. Both
services call `assertRequiredEnv()` at startup and **refuse to boot in
production** if their required vars are missing — the backend analog of the
Vercel workflow failing fast when `VERCEL_TOKEN` is unset.

### Required vs optional env vars

Set inline by `render.yaml` (no action needed): `APP`, `NODE_ENV`, `APP_ENV`,
`PORT`, and all `DB_*` (injected from the managed database).

**Required secrets** you must set in the dashboard (`sync: false`):

| Var                              | Service  | Why                                                                               |
| -------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `AUTH_JWT_SECRET`                | internal | JWT signing; `assertRequiredEnv()` requires it in prod                            |
| `CORS_ALLOWED_ORIGINS`           | both     | comma-separated apex domains; **subdomains** over http/https are allowed (see §6) |
| `INTERNAL_HOST`, `EXTERNAL_HOST` | both     | full https URLs used for links / screenshots                                      |

**Recommended:** `ADMIN_TOKEN` (internal) — gates admin routes via
`AdminTokenGuard`. Set it for any internet-facing deploy.

**Optional integrations** (feature is disabled when unset): `STRIPE_SECRET_KEY`
/ `STRIPE_WEBHOOK_SECRET`, `JIRA_HOST_URL` / `JIRA_API_EMAIL` / `JIRA_API_TOKEN`,
`SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` /
`GOOGLE_PRIVATE_KEY` / `GOOGLE_SPREADSHEET_ID`, `AWS_REGION` / `AWS_S3_BUCKET` /
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, `SENTRY_DSN`.

`.env.example` at the repo root documents every key with comments.

### Manual dashboard steps (one-time)

1. Render dashboard → **New + → Blueprint** → select this repo → **Apply**.
   Render reads `render.yaml` and creates the two services + the database.
2. For each service, open **Environment** and fill in the `sync: false` secrets
   (at minimum `AUTH_JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `INTERNAL_HOST`,
   `EXTERNAL_HOST`; plus `ADMIN_TOKEN` for the internal service).
3. Trigger the first deploy (Render does this automatically after Apply once env
   is set). `autoDeploy: true` means subsequent pushes to the default branch
   redeploy.
4. Verify health: `curl https://<service>.onrender.com/api/health` returns the
   Terminus payload with a `database: up` check.

### Preview vs production

- **Production**: the services defined in `render.yaml` on the default branch
  (`autoDeploy: true`).
- **Preview**: enable Render **Preview Environments** (per-PR) in the dashboard
  if desired — not enabled by `render.yaml` to avoid spinning up paid Postgres
  per PR. Otherwise validate PRs locally (§5) before merge.

### Schema / migrations

In production `APP_ENV=production` means TypeORM `synchronize: false`. Author and
run migrations explicitly (`pnpm migration:generate` / `pnpm migration:run`,
both wired in `package.json` against `libs/core/src/datasource.ts`). See
[`SELF_HOSTING.md`](./SELF_HOSTING.md#updating).

---

## 4. Backend — self-host (Docker Compose)

For VPS / on-prem / air-gapped hosts, `docker-compose.prod.yml` runs internal +
external + Postgres + nginx on a single box. Full walkthrough in
[`SELF_HOSTING.md`](./SELF_HOSTING.md). TL;DR:

```bash
cp .env.example apps/remote-platform-internal/src/.env.production
cp .env.example apps/remote-platform-external/src/.env.production
# edit both with strong secrets
export ADMIN_TOKEN="$(openssl rand -hex 24)"
docker compose -f docker-compose.prod.yml up -d
```

nginx terminates TLS and proxies to the two services (do not expose 3000/3001
directly). The same multi-stage `Dockerfile` backs both compose and Render.

---

## 5. SDK & Figma plugin

- **SDK** (`sdk/`) builds to UMD + ESM (`pnpm --filter remote-debug-sdk build`)
  and is served by the `external` service at `/sdk/index.umd.js`. If you also
  want to publish it to npm, run the build then `npm publish` from `sdk/`
  (zero-runtime-dependency package — see the CLAUDE.md library note).
- **Figma plugin** (`figma-plugin/`) builds via `pnpm --filter figma-plugin build`
  and is uploaded to Figma manually (Figma → Plugins → publish). Not part of CI
  deploy.

---

## 6. Security notes that affect deploy

- **CORS allow-listing** is centralised in
  `libs/common/src/security/cors-origin.ts` (`createCorsOriginValidator`), used
  by the external service. `CORS_ALLOWED_ORIGINS` is a comma-separated list of
  apex domains; the validator allows **any subdomain** of each over http/https
  with no path, plus `localhost`. The apex domain itself is intentionally **not**
  matched — front it with a subdomain. This boundary is unit-tested
  (`cors-origin.spec.ts`).
- Always set `ADMIN_TOKEN` when the internal API is internet-reachable.
- The frontend security headers live in `vercel.json`; the backend sets `helmet`
  in each `main.ts`.

---

## 7. End-to-end deploy checklist

1. CI green on `main` (lint + typecheck + test + build across backend, client,
   sdk, admin, figma — see `.github/workflows/ci.yml` / [`CICD.md`](./CICD.md)).
2. **Frontend**: Vercel deploys via `workflow_run` after CI (or `vercel --prod`).
   Requires `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`.
3. **Backend**: Render Blueprint applied; `sync: false` secrets set; services
   healthy at `/api/health`. (Or `docker compose -f docker-compose.prod.yml up -d`.)
4. **Database**: managed PG (Render) or the compose `postgres` service is up;
   migrations applied for prod.
5. Point `CORS_ALLOWED_ORIGINS` at your real frontend domain(s) and set
   `INTERNAL_HOST` / `EXTERNAL_HOST` to the live URLs.
