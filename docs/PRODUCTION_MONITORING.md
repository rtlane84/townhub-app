# Production Monitoring

TownHub includes application-level health, admin diagnostics, structured logs, and Sentry error capture. External uptime, centralized logs, provider alerts, and tested notification routing must be configured in each deployed environment; repository code alone cannot provide those guarantees.

## Public health endpoint

**`GET /health`**

Use this endpoint for external uptime monitors (UptimeRobot, Better Stack, etc.).

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
| Frontend | `GET https://app…/` | 1–5 minutes | Two failures, non-200, or 10-second timeout |
| TLS/domain | Frontend and API certificates | Daily | Expiry within 21 days or certificate error |

Route production alerts to the platform owner and one backup contact. Staging alerts may be lower urgency but must still reach an actively reviewed channel.

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

## Recommended tooling

| Tool | Purpose |
|------|---------|
| **Sentry** | Error aggregation — see [SENTRY_SETUP.md](SENTRY_SETUP.md) |
| **UptimeRobot / Better Stack** | External uptime on `/health` |
| **Managed Postgres backups** | Database disaster recovery — see [DATABASE_BACKUP_AND_RECOVERY.md](DATABASE_BACKUP_AND_RECOVERY.md) |
| **Stripe Dashboard → Webhooks** | Delivery logs and retry inspection |
| **Log drain** (Fly.io, Railway, etc.) | Centralize Pino JSON logs in production |

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
