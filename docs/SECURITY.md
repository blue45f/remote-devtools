# Security Guide

## HTTP Security Headers (Helmet)

Both `remote-platform-external` and `remote-platform-internal` servers use [Helmet](https://helmetjs.github.io/) to set secure HTTP headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 0` (modern browsers handle this natively)
- `Strict-Transport-Security` (HSTS)
- `X-DNS-Prefetch-Control: off`

CSP and COEP are disabled to support DevTools frontend embedding.

## Rate Limiting

Both servers enforce rate limiting via `@nestjs/throttler`:

| Setting | Value |
|---------|-------|
| TTL | 60 seconds |
| Limit | 100 requests per TTL |

Exceeding the limit returns `429 Too Many Requests`.

## Input Validation

All request payloads are validated using `class-validator` through NestJS `ValidationPipe`:

- **whitelist**: Strips unknown properties
- **forbidNonWhitelisted**: Rejects requests with unknown properties
- **transform**: Auto-transforms payloads to DTO class instances

## CORS Policy

### External Server (port 3001)
- Allows requests with no `Origin` header (server-to-server)
- Validates origins against `CORS_ALLOWED_ORIGINS` environment variable
- `localhost` is always allowed for development
- Credentials are enabled

### Internal Server (port 3000)
- Same policy as external server

### Configuration
```bash
# Comma-separated list of allowed domains
CORS_ALLOWED_ORIGINS=example.com,myapp.io
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CORS_ALLOWED_ORIGINS` | No | Allowed CORS domains (comma-separated) |
| `JIRA_HOST_URL` | For Jira | Jira instance base URL |
| `JIRA_API_EMAIL` | For Jira | Jira API authentication email |
| `JIRA_API_TOKEN` | For Jira | Jira API token |
| `SLACK_BOT_TOKEN` | For Slack | Slack Bot OAuth token |
| `AWS_REGION` | For S3 | AWS S3 region |
| `S3_BUCKET_NAME` | For S3 | S3 backup bucket name |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | For Sheets | Google service account email |
| `GOOGLE_PRIVATE_KEY` | For Sheets | Google service account private key |

> **Important**: Never commit `.env` files with real credentials. Use `.env.example` as a template.

## CI/CD Pipeline

GitHub Actions CI runs on every push and PR to `main`/`develop`:

1. **Lint** - ESLint with TypeScript rules
2. **Type Check** - `tsc --noEmit`
3. **Test** - Vitest with coverage report
4. **Build** - NestJS production build (runs after all checks pass)

## Database Security

- TypeORM parameterized queries prevent SQL injection
- Raw queries use constant values only (no user input interpolation)
- `synchronize` is disabled in production environments
- Record cleanup uses transactions with rollback on failure
