# Self-hosting Remote DevTools

This guide walks through running the entire stack on your own
infrastructure — VPS, on-prem, or air-gapped environments. Everything is MIT
licensed; no external SaaS dependencies are required.

## TL;DR (Docker)

```bash
git clone https://github.com/blue45f/remote-devtools.git
cd remote-devtools

cp .env.example apps/remote-platform-internal/src/.env.production
cp .env.example apps/remote-platform-external/src/.env.production
# edit both .env.production with strong secrets

# Optional but recommended for any internet-facing deploy:
export ADMIN_TOKEN="$(openssl rand -hex 24)"

docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

The stack is now reachable behind nginx on port 80/443.
Console: `http://your-host/` — assets and API are mounted same-origin via the
nginx config.

## Architecture recap

```
Browser (your customer)
   │ SDK (UMD or ESM)
   │ WebSocket + HTTP
   ▼
external (3001) ─── persists CDP events ──┐
                                          ▼
                                    PostgreSQL
                                          ▲
internal  (3000) ─── reads sessions ──────┘
   │ DevTools UI, dashboard API, replay player
   ▼
Operator (you)
```

`docker-compose.prod.yml` runs all five services on a single host. Scale
external horizontally by running multiple instances behind nginx + a
load balancer.

## Required environment variables

| key | scope | example |
|-----|-------|---------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | both | `postgres` / `5432` / `myuser` / `…` / `mydb` |
| `NODE_ENV` | both | `production` |
| `APP_ENV` | both | `production` (controls TypeORM `synchronize`) |
| `PORT` | each | `3000` (internal) / `3001` (external) |
| `CORS_ALLOWED_ORIGINS` | both | `your-domain.com,app.your-domain.com` |
| `EXTERNAL_HOST`, `INTERNAL_HOST` | both | full https URLs |

### Optional (auth, integrations)

| key | scope | description |
|-----|-------|-------------|
| `ADMIN_TOKEN` | internal | When set, the `AdminTokenGuard` requires `Authorization: Bearer <token>` on protected routes. |
| `JIRA_HOST`, `JIRA_USERNAME`, `JIRA_API_TOKEN`, `JIRA_PROJECT` | external | Auto-create Jira tickets from sessions. |
| `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` | external | Notify a Slack channel on session creation. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SPREADSHEET_ID` | internal | Sync ticket templates from a Google Sheet. |
| `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | external | Off-host backup of recorded sessions. |

`.env.example` at the repo root is the source of truth — every supported
key is documented with comments.

## Building images

```bash
docker compose -f docker-compose.prod.yml build
```

Images: `remote-devtools-internal:latest`, `remote-devtools-external:latest`.
Both stages share the multi-stage `Dockerfile` and run as non-root.

## Without Docker

If you prefer bare-metal Node:

```bash
# 1. Install Postgres 15+ and create a DB
createdb mydb

# 2. Install dependencies and build
pnpm install --frozen-lockfile
pnpm build:all
cd sdk && pnpm build && cd ..
cd client && pnpm build && cd ..

# 3. Start with PM2
pnpm pm2:start          # or: node dist/apps/remote-platform-internal/main.js
```

For local development without Docker (laptops, CI), use the embedded Postgres
helper instead: `node scripts/start-pg.mjs` (see `CLAUDE.md`).

## Hardening

- Always set `ADMIN_TOKEN` if the internal API is reachable from the public internet.
- Terminate TLS at nginx; don't expose 3000/3001 directly.
- Set `CORS_ALLOWED_ORIGINS` to the exact list of frontends you trust.
- Run `synchronize: false` (default in production) and apply schema changes via migrations.
- Restrict pgAdmin (port 5050 in dev compose) to a private network.
- Rotate `ADMIN_TOKEN`, Jira/Slack/AWS keys quarterly.

## Backups

PostgreSQL: nightly `pg_dump | gzip` to S3 / B2 / wherever you keep
backups. Recorded session events live in the `record`, `screen`, `dom`,
`network`, `runtime` tables.

S3 bucket (when configured): the external service uploads heavy session
artifacts directly; remote-devtools-internal's session-replay service can
read them back via the `/sessions/:id/events` endpoint.

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

Schema changes are auto-applied in development (`APP_ENV=development`); in
production migrations should be authored and run explicitly. The current
release does not yet ship a migration runner — see [`docs/LAUNCH.md`](./LAUNCH.md)
for the roadmap.

## Troubleshooting

| symptom | likely cause |
|---------|--------------|
| `502 Bad Gateway` from nginx | one of the upstream services hasn't started — check `docker compose logs internal external` |
| Sessions list empty | external service not reaching Postgres or no SDK connected yet |
| `EADDRINUSE :::3000` | the internal service is already running on the host — stop the dev-mode `pnpm start:internal:dev` |
| SDK script returns 404 | the external image doesn't include `sdk/dist`. Rebuild with `pnpm --filter sdk build` first. |

## Next steps

- See [`DEPLOY_DEMO.md`](./DEPLOY_DEMO.md) to host a public demo on Vercel.
- See [`LAUNCH.md`](./LAUNCH.md) for what it would take to go from
  self-hosted to a multi-tenant SaaS.
