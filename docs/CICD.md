# CI/CD setup

## Workflows

| File | Trigger | What it does |
|------|---------|--------------|
| `.github/workflows/ci.yml` | every push / PR | lint + typecheck + test + build (backend, SDK, client) |
| `.github/workflows/deploy-vercel.yml` | push to `main` (client/sdk paths) | builds + deploys the public Vercel demo |

## Required GitHub secrets

The Vercel deploy workflow needs three secrets on the repo
(Settings → Secrets and variables → Actions):

| secret | how to obtain |
|--------|---------------|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens — create a scoped token |
| `VERCEL_ORG_ID` | Vercel Settings → General → "Your ID" — org / team id |
| `VERCEL_PROJECT_ID` | Project Settings → General → "Project ID" |

Alternatively, the existing local `.vercel/project.json` carries
`projectId` and `orgId` — copy them directly.

After setting the secrets:

```
git push origin main
```

The workflow runs and posts the deploy URL to the GitHub Actions summary.

## Manual deploy

If GitHub Actions is unavailable or you want to deploy from your laptop:

```bash
vercel deploy --prod
```

The CLI uses `~/Library/Application Support/com.vercel.cli/auth.json` for
auth — no secrets needed locally.

## Optional: PR preview deploys

Vercel automatically deploys a preview URL for every push to a non-`main`
branch (when the GitHub integration is connected). The workflow above only
handles **production**; preview deploys are a one-time toggle in the Vercel
dashboard.

## Rollback

```bash
vercel rollback <deployment-url>
# or via dashboard: Project → Deployments → Promote
```
