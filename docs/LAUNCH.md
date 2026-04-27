# Launch checklist — going from self-hosted to a SaaS

This is the road from **"I run it on my server"** to **"customers sign up,
swipe a card, and start capturing sessions"**. It's not a weekend job —
expect 4–8 weeks of focused work before you should onboard a paying user.
Before starting, decide whether the SaaS is the goal or whether
self-hosting + light hosting consulting is enough.

## Decision tree

```
Audience
├── A handful of internal teams ──────► Self-host (docs/SELF_HOSTING.md)
├── Open-source community + consulting ► Self-host + paid support
├── Indie / single-tenant per customer ► Single-tenant deployments per client
└── True multi-tenant SaaS              ► Read on
```

## Phase 1 · Tenancy (1–2 weeks)

The current data model is **single-tenant**: one `record` table, one
sessions list, one dashboard. Multi-tenant requires explicit isolation.

### Add an `Organization` entity

```
@Entity("organizations")
class OrganizationEntity {
  id: uuid;
  slug: string;
  plan: "free" | "starter" | "pro";
  createdAt: Date;
  ownerUserId: uuid;
}
```

### Scope every existing entity

Add `orgId: uuid` (indexed, NOT NULL) to:

- `record`
- `screen`, `dom`, `network`, `runtime`
- `ticket_logs`, `ticket_components`, `ticket_labels`, `ticket_template_list`
- `device_info_list`, `user`

### Filter all queries

Every repository call must scope to the requesting org. The cleanest way is
a `RequestContext` (cls-hooked / AsyncLocalStorage) populated by an auth
guard, then injected into a base repository.

### Migrate existing rows

Write a migration that creates a default org and back-fills `orgId` on every
historical row, then makes the column NOT NULL.

## Phase 2 · Authentication (3–5 days)

Pick a provider. Don't build this yourself.

| provider | pros | cons |
|----------|------|------|
| **Clerk** | full UI components, Korean i18n, easy team mgmt | $25/mo+ after 10k MAUs |
| **Supabase Auth** | open source, OAuth + magic link | UI you build yourself |
| **WorkOS** | enterprise SSO (SAML, SCIM) | overkill for early stage |
| **Auth0** | mature | ergonomics dated |

Wire the provider to a NestJS guard that:
1. Verifies the JWT.
2. Looks up `Organization` by `user_id`.
3. Stuffs `{ userId, orgId, plan }` into the request context.

Frontend: call provider's React SDK in `Layout.tsx`, redirect unauthenticated
users to `/sign-in`.

## Phase 3 · Billing (3–5 days)

**Stripe** is the default answer.

1. Create products: `Free`, `Starter ($29/mo)`, `Pro ($99/mo)`.
2. Add a `Stripe Checkout` flow that creates the subscription on plan upgrade.
3. Webhook handler at `/api/billing/webhook` updates `Organization.plan` on:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Enforce plan limits in code:
   - Free: 100 sessions/month, 7-day retention
   - Starter: 5k sessions/month, 30-day retention
   - Pro: 50k sessions/month, 90-day retention
5. Show a plan-status card in the dashboard pulling from Stripe.

## Phase 4 · Hosting (1–3 days)

| tier | frontend | backend | database | object storage |
|------|----------|---------|----------|----------------|
| MVP  | Vercel    | Railway / Fly.io      | Neon (free) | Cloudflare R2 |
| Growth | Vercel  | Fly.io (multi-region) | Neon Pro    | R2 / S3 |
| Scale | Cloudfront + S3 | EKS / managed Kubernetes | RDS Aurora | S3 |

The current docker-compose.prod.yml is the right starting point for
Railway / Fly. Only adjust:
- Drop the postgres service (use managed)
- Add health checks / readiness probes
- Mount secrets through the platform's secrets manager

## Phase 5 · Operations (ongoing)

- **Monitoring**: Sentry (errors) + Grafana Cloud / Datadog (metrics + logs)
- **Status page**: status.your-domain.com (Better Stack / Instatus)
- **On-call**: PagerDuty / Splunk On-Call (free tier covers solo founders)
- **Support**: Plain / Front / a shared inbox; or a `/help` page that posts to a Slack channel

## Phase 6 · Compliance (varies)

| concern | what you need |
|---------|---------------|
| GDPR | DPA, data deletion endpoint, EU data residency option |
| SOC 2 | Vanta or Drata; ~6 months for Type II |
| Privacy policy & ToS | Termly / draft a custom policy with a lawyer |
| Cookie consent | Cookiebot or build your own banner |

## Phase 7 · Marketing site polish

The Vercel demo deploy in `docs/DEPLOY_DEMO.md` already gives you a landing
page. To convert visitors:
- Add an OG image (`og-image.png`) — see Vercel's `@vercel/og`
- Write 2–3 case studies / use cases (hint: write them as docs first)
- Add a `/pricing` page that mirrors the Stripe products
- Add a `/docs` route or link out to GitHub README

## What's already in the codebase

The following are pre-wired so the SaaS path doesn't start from scratch:

| feature | status |
|---------|--------|
| Frontend `/` landing page | ✅ shipped |
| Vercel demo build (`vercel.json` + `VITE_FORCE_DEMO`) | ✅ shipped |
| Optional admin token guard (`ADMIN_TOKEN`) | ✅ shipped |
| Production `docker-compose.prod.yml` | ✅ shipped |
| Health endpoint (`/api/health`) | ✅ shipped |
| Demo seed data (drop-in replacement for backend) | ✅ shipped |
| Activity feed + dashboard + replay player | ✅ shipped |
| Multi-tenant `orgId` scoping | ❌ stub: see Phase 1 |
| Auth integration | ❌ stub: see Phase 2 |
| Stripe billing | ❌ stub: see Phase 3 |
| Migration runner | ❌ TypeORM `synchronize: true` only |

## Estimated runway to first customer

| phase | weeks |
|-------|-------|
| Tenancy | 1.5 |
| Auth | 1 |
| Billing | 1 |
| Hosting + ops | 1 |
| Compliance baseline | 1 |
| Marketing polish | 0.5 |
| **Total** | **~6 weeks** for one focused engineer |

Add 50% if it's not your day job.

## When NOT to do this

- You have 0 paying customers asking for it. Self-host first; let demand
  pull you forward.
- You can't commit ≥ $200/month for hosting + Sentry + monitoring + Stripe.
- You don't want to be on call for someone else's debugger going down.

In those cases, the open-source self-host story (good README, clean Docker
compose, working demo URL) is the right amount of "site-ification" — and it's
already done as of the current commit.
