# Deploy the public demo to Vercel

The `client/` directory is configured for a one-command Vercel deploy that
hosts the marketing landing + the entire UI in offline demo mode (no backend
required).

## Prerequisites

- A Vercel account (free tier is fine).
- Vercel CLI: `npm i -g vercel` (or use `npx vercel` ad-hoc).

## One-time setup

```bash
cd client
vercel login                  # opens your browser
vercel link                   # creates the project, picks an org
```

Vercel will detect `vercel.json`, framework = `vite`, output = `dist`.

## Deploy

```bash
# Preview deploy (gets you a transient URL)
vercel

# Production deploy (gets your project's stable URL)
vercel --prod
```

That's it. The build sets `VITE_FORCE_DEMO=true` so visitors never hit a
backend — every API call short-circuits to seed data in `src/lib/seed.ts`.

## Custom domain (optional)

```bash
vercel domains add demo.your-domain.com
```

Then add the CNAME the CLI prints to your DNS provider.

## What ships in the demo build

- Landing page (`/`) — hero, features, code snippets, CTA
- App shell (`/dashboard`, `/sessions`, `/sessions/:id`, `/sandbox/*`)
- Cmd+K palette, keyboard shortcuts, theme toggle
- Activity feed, rrweb replay, session detail tabs
- All powered by 12 seed sessions + 5 rrweb events + a screen preview

## What's NOT in the demo

- Real session capture (no SDK → backend pipeline)
- Multi-user / multi-tenant / auth (single browser, single localStorage)
- Stripe / billing
- Persistent data (refresh resets to seed)

For those see [`SELF_HOSTING.md`](./SELF_HOSTING.md) and
[`LAUNCH.md`](./LAUNCH.md).

## Local production preview

To run the same build locally before deploying:

```bash
cd client
VITE_FORCE_DEMO=true pnpm build
pnpm preview --port 4173
```

Open `http://localhost:4173` — it should show the landing page and all routes
should resolve.
