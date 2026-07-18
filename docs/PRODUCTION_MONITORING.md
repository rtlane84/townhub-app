# Production Monitoring

TownHub includes application-level health, admin diagnostics, structured logs, and Sentry error capture. External uptime, centralized logs, provider alerts, and tested notification routing must be configured in each deployed environment; repository code alone cannot provide those guarantees.

## Public health endpoint

**`GET /health`**

Use this endpoint for external uptime monitors (UptimeRobot, Better Stack, etc.). Operator checks on 2026-07-14 and again on 2026-07-15 returned HTTP 200 for both `https://api.townhub.io/health` and `https://api-staging.townhub.io/health`. Frontend origins `https://townhub.io/` and `https://staging.townhub.io/` also returned HTTP 200 on 2026-07-15. GitHub Actions workflow `.github/workflows/uptime-health-check.yml` has been succeeding on schedule (example run `29416225184`). These are not a substitute for Better Stack / UptimeRobot human alert routing because Actions notifications alone may miss a non-GitHub contact path.

**Response (minimal, safe):**

```json
{
  "status": "ok",
  "timestamp": "2026-06-24T12:00:00.000Z",
  "uptimeSeconds": 12345
}
```

- No authentication required
- Does not expose service configuration, env vars, or internal errors
- Returns HTTP 200 when the API process is running
- A successful response means only that the API process is responding — not that every dependency is healthy

**Legacy alias:** `GET /api/healthz` returns `{ "status": "ok" }` for backward compatibility.

### Recommended uptime monitor setup

1. Monitor `https://<your-domain>/health` every 1–5 minutes
2. Alert on non-200 responses or timeouts (> 10s)
3. Do not send auth headers or query parameters with secrets

For the production beta, create these monitors in both staging and production:

| Monitor | Check | Interval | Alert condition |
|---|---|---|---|
| API process | `GET https://api…/health` | 1 minute | Two failures, non-200, or 10-second timeout |
| Frontend | `GET https://townhub.io/` in production; `GET https://staging.townhub.io/` in staging | 1–5 minutes | Two failures, non-200, or 10-second timeout |
| TLS/domain | Frontend and API certificates | Daily | Expiry within 21 days or certificate error |

Route production alerts to the platform owner and one backup contact. Staging alerts may be lower urgency but must still reach an actively reviewed channel.

### Railway deploy healthchecks (configured 2026-07-15)

Both staging and production API service instances set `healthcheckPath=/health` with `healthcheckTimeout=30`. This is Railway’s pre-promotion check and complements external monitors; it is not an external uptime product.

### GitHub Actions uptime probe alert (configured 2026-07-15)

`.github/workflows/uptime-health-check.yml` still probes the four public surfaces every 5 minutes. On job failure it opens or comments on a GitHub issue titled `OPS-002: External uptime check failed` labeled `uptime`. Acknowledge and close that issue only after all probes are healthy again. Keep Better Stack / UptimeRobot email or SMS as the primary human route.

### Better Stack free-tier setup (complete 2026-07-15)

Team `t570646` (Uptime + Errors + Telemetry) is configured to maximize free monitoring:

| Area | Status | Notes |
|---|---|---|
| Uptime monitors | Partial | Live dashboard audit on 2026-07-17 confirmed only `https://api.townhub.io/health` (3-minute checks, e-mail alerts). Additional Better Stack monitors currently require a paid upgrade. GitHub Actions `.github/workflows/uptime-health-check.yml` still probes production/staging API + frontend every 5 minutes as a backup signal. |
| Test alert | Acknowledged | Monitor `api.townhub.io/health` test alert received by owner (2026-07-15). Add a second team member before launch and confirm a test alert reaches both inboxes. |
| Status page | Deferred | Creating a status page redirected to billing/features; stay on free Pay as you go — do not purchase bundles just for OPS-002. Revisit after free-plan status-page entitlement is clear. |
| Errors (Sentry-compatible) | Live; privacy scrub deployed 2026-07-18 | `TownHub Frontend` + `TownHub API` apps receive staging and production events. Deployed sanitization covers exception-message text, request URLs, fingerprints, breadcrumbs, tags, and structured context. Confirm new production/staging issues no longer contain emails or Clerk identifiers. Do not commit DSNs. |
| Logs (Railway → Telemetry) | Connected (ingest verified 2026-07-18) | Staging `locomotive` and production `locomotive-production` both target the same Better Stack HTTP ingest host with `LOCOMOTIVE_WEBHOOK_MODE=betterstack`. A controlled ingest probe returned HTTP 202. Confirm the marker in Live Tail from the Better Stack UI; rotate the source token if the dashboard still shows zero sources (UI auth mismatch) or after any credential exposure. Use an **account-scoped** Railway API token (`LOCOMOTIVE_RAILWAY_API_KEY`); tokens live only in Railway/Better Stack secrets. |

Dashboards: [Monitors](https://uptime.betterstack.com/team/t570646/monitors), [Errors applications](https://errors.betterstack.com/team/t570646/applications), [Log sources](https://telemetry.betterstack.com/team/t570646/sources).

## Admin Operations Center

**Path:** Admin dashboard → **Operations Center** (System Status)

**API:** `GET /api/admin/system/health` (admin role required)

The admin page shows:

- **Application** — environment, version, build date, commit SHA (when env vars are set), uptime, start time
- **Service readiness** — API, database (live ping), storage, email, SMS, Stripe, auth, weather/geocoding, background jobs, Sentry
- **Operational logs** — durable notification delivery history and platform audit activity
- **Business metrics** — orders, subscriptions, and related counts when available

There is **no** in-app API error history. Unexpected exceptions go to **Sentry** (when configured) and structured Pino `[operational]` logs. Do not treat notification or audit logs as proof that every integration is healthy.

Each service reports:

| Field | Description |
|-------|-------------|
| `status` | `healthy`, `configured`, `degraded`, `unavailable`, or `not_configured` |
| `message` | Human-readable summary |
| `responseTimeMs` | Present for timed checks (e.g. database) |
| `metadata` | Safe non-secret details only (e.g. Stripe mode `test`/`live`, storage mode). Never includes DSNs or API keys. |

### Service status meanings

| Status | Meaning |
|--------|---------|
| **healthy** | A real successful check (for example a database ping, or a recorded successful job/weather refresh) |
| **configured** | Credentials or settings are present; TownHub did **not** perform a live provider ping |
| **degraded** | Partially working or suboptimal (for example local storage in production) |
| **unavailable** | Required or expected capability is broken or incomplete for use |
| **not_configured** | Optional capability intentionally unset |

Clerk, Stripe, email, SMS, storage, and weather are reported as **configured** (not healthy) when only environment variables or settings are verified.

### Overall status meanings

| Status | Meaning |
|--------|---------|
| **healthy** | Required services are OK; remaining services are healthy or merely configured |
| **warning** | Optional gaps, degraded services, or incomplete configuration |
| **error** | A required service failed (for example database unreachable) or health-report assembly failed |

Optional services (email, SMS, Stripe, weather, Sentry, background jobs) being `not_configured` in **development** does not mark the platform overall as error. If the frontend cannot load health, it shows a prominent unavailable state instead of empty healthy cards.

## Structured operational logging

The API logs operational failures with the prefix `[operational]` and an `operationalEvent` field:

| Event | When |
|-------|------|
| `health_check_unhealthy` | Admin health report shows error overall status |
| `health_check_failed` | Admin health endpoint threw while assembling the report |
| `email_send_failed` | Outbound email failed |
| `sms_send_failed` | Outbound SMS failed |
| `order_notification_email_failed` | Owner/customer email notification failed |
| `order_notification_sms_failed` | Owner SMS notification failed |
| `order_notification_failed` | Owner notification orchestration failed |
| `stripe_webhook_failed` | Stripe webhook rejected or misconfigured |
| `storage_upload_failed` | Media upload to storage failed |

Logs include IDs useful for debugging (`businessId`, `orderId`, `appointmentRequestId`) but **not** full payment payloads, API keys, or unnecessary customer PII.

### Optional build metadata env vars

Set in deployment for richer Admin System Status:

- `APP_NAME` — display name (default: TownHub)
- `APP_VERSION` — release version
- `BUILD_DATE` — ISO build timestamp
- `GIT_COMMIT_SHA` — git commit (short or full)

## Sentry setup

Create separate Sentry/Better Stack apps for the API (`SENTRY_DSN`) and frontend (`VITE_SENTRY_DSN`) so alerts and releases can be triaged independently. Vite variables must be present at build time.

Tag events with **`DEPLOYMENT_ENVIRONMENT`** (`staging` or `production`) so Better Stack can filter staging vs production on the same DSN. The API reads `DEPLOYMENT_ENVIRONMENT` (fallback `NODE_ENV`). The frontend build exposes it as `VITE_DEPLOYMENT_ENVIRONMENT` from `DEPLOYMENT_ENVIRONMENT` or an explicit `VITE_DEPLOYMENT_ENVIRONMENT`. Cloudflare Builds already set `DEPLOYMENT_ENVIRONMENT`; Railway must set it per environment.

- API initialization: `artifacts/api-server/src/instrument.ts`
- Frontend initialization: `artifacts/townhub/src/lib/sentry.ts`
- Optional release tags: `APP_VERSION`, `GIT_COMMIT_SHA`, `VITE_APP_VERSION`, `VITE_GIT_COMMIT_SHA`
- Development-only tests: `GET /api/debug/sentry` and `/debug/sentry`; neither route is mounted in production

Verify one event from each staging surface and confirm routing to the primary operator. TownHub scrubs request headers, cookies, bodies, query strings and URL values, exception-message text, credentials, payment fields, common secret keys, e-mail addresses, and Clerk-style provider identifiers. Do not add customer PII, tokens, provider identifiers, or secrets to Sentry context manually. A stable signed-in user ID and route/business identifiers may be attached for diagnosis and must be reflected accurately in privacy disclosures.

When a DSN is absent, the app continues without sending events. Admin Operations Center reports only whether Sentry is configured and never exposes the DSN.

## Recommended tooling

| Tool | Purpose |
|------|---------|
| **Sentry SDK → Better Stack Errors (or sentry.io)** | API and frontend error aggregation; Better Stack free tier includes 100k exceptions/month via Sentry-compatible DSN |
| **Better Stack Uptime** | External uptime on `/health` and frontends with email alert routing |
| **GitHub Actions `uptime-health-check.yml`** | Independent 5-minute probes of staging/production API `/health` and frontend origins |
| **Managed Postgres backups** | Database disaster recovery — see [DATABASE_BACKUP_AND_RECOVERY.md](DATABASE_BACKUP_AND_RECOVERY.md) |
| **Stripe Dashboard → Webhooks** | Delivery logs and retry inspection |
| **Better Stack HTTP logs + Railway Locomotive** | Centralize Pino JSON logs (free: 3 GB / 3 days). Staging `locomotive` and production `locomotive-production` ship TownHub API logs to Telemetry source `TownHub Railway API logs`. |

## Required alert matrix for beta

| Signal | Source | Required routing |
|---|---|---|
| API/frontend exception | Sentry | Immediate owner notification for new fatal/high issues; daily digest for lower severity |
| API or frontend unavailable | External uptime monitor | Owner + backup contact |
| `stripe_webhook_failed` or repeated webhook retries | Railway logs + Stripe Dashboard | Owner; payment incidents are urgent |
| Database unavailable or pool exhaustion | Railway logs, Operations Center, provider alerts | Owner + backup contact |
| Backup failure | PostgreSQL provider | Owner + backup contact |
| Email/SMS/push delivery degradation | Operational logs/provider dashboards | Owner during beta operating hours |
| Job overdue or failed | Operations Center + scheduler logs | Owner |
| Account deletion approaching deadline | Admin → Users queue | Platform owner/privacy operator |

Production alerts must not depend solely on the TownHub application or the same provider being monitored.

## Release verification

For every staging and production release, record the environment, version, commit SHA, tester, timestamp, and evidence for:

1. `/health` success from outside the hosting provider.
2. Frontend load and authenticated API call.
3. Admin Operations Center database check and provider configuration state.
4. A controlled Sentry test event tagged with the release. Production debug routes are disabled, so use a reviewed temporary test mechanism or Sentry SDK test during the release window and remove it afterward.
5. A controlled operational log event reaching the central log destination without PII or secrets.
6. Stripe test-mode webhook delivery in staging; an approved low-risk live verification in production.
7. Backup status and the most recent restore-drill evidence.
8. Alert delivery acknowledgment by the primary and backup contacts.

Do not mark monitoring complete because environment variables are present. A test alert must be received and acknowledged.

## What must never be logged or exposed

- API keys, tokens, passwords, webhook secrets
- `DATABASE_URL`, Supabase service role keys
- Stripe secret keys or webhook signing secrets
- Sentry DSNs in health payloads or admin UI
- Full credit card or payment instrument data
- Customer emails/phones except where strictly needed (prefer IDs)
- Raw request bodies from authenticated endpoints

Health endpoints and Operations Center report **configuration presence** and **connectivity where checked**, never secret values.

## Local development

- Vite dev server proxies `/health` and `/api` to the API server (port 8080)
- Run API: `pnpm --filter @workspace/api-server run dev`
- Run frontend: `pnpm --filter @workspace/townhub run dev`
- Operations Center requires a user with `ADMIN` role
