# Production Monitoring

TownHub includes lightweight operational visibility for uptime checks, admin diagnostics, and structured failure logging. This document describes what is available today and recommended next steps.

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

**Legacy alias:** `GET /api/healthz` returns `{ "status": "ok" }` for backward compatibility.

### Recommended uptime monitor setup

1. Monitor `https://<your-domain>/health` every 1–5 minutes
2. Alert on non-200 responses or timeouts (> 10s)
3. Do not send auth headers or query parameters with secrets

## Admin System Status

**Path:** Admin dashboard → **System Status**

**API:** `GET /api/admin/system/health` (admin role required)

The admin page shows:

- **Application** — environment, version, build date, commit SHA (when env vars are set), uptime, timestamp
- **Service health** — API, database, storage, email, SMS, Stripe, auth, weather/geocoding

Each service reports:

| Field | Description |
|-------|-------------|
| `status` | `healthy`, `degraded`, `unhealthy`, or `not_configured` |
| `message` | Human-readable summary |
| `responseTimeMs` | Present for timed checks (e.g. database) |
| `metadata` | Safe non-secret details only (e.g. Stripe mode `test`/`live`, storage mode) |

### Overall status meanings

| Status | Meaning |
|--------|---------|
| **healthy** | Required services (database, auth) are OK |
| **degraded** | Required services OK; optional services missing or suboptimal (email/SMS not configured, local storage in production, etc.) |
| **unhealthy** | A required service failed (e.g. database unreachable) |

Optional services (email, SMS, Stripe, weather) being `not_configured` does **not** mark the system unhealthy.

## Structured operational logging

The API logs operational failures with the prefix `[operational]` and an `operationalEvent` field:

| Event | When |
|-------|------|
| `health_check_unhealthy` | Admin health report shows unhealthy overall status |
| `health_check_failed` | Admin health endpoint threw an error |
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

## Recommended future tooling

These are **not** included in the current codebase but are good next steps:

| Tool | Purpose |
|------|---------|
| **Sentry** (or similar) | Error aggregation and stack traces |
| **UptimeRobot / Better Stack** | External uptime on `/health` |
| **Supabase backups / PITR** | Database disaster recovery |
| **Stripe Dashboard → Webhooks** | Delivery logs and retry inspection |
| **Log drain** (Fly.io, Railway, etc.) | Centralize Pino JSON logs in production |

## What must never be logged or exposed

- API keys, tokens, passwords, webhook secrets
- `DATABASE_URL`, Supabase service role keys
- Stripe secret keys or webhook signing secrets
- Full credit card or payment instrument data
- Customer emails/phones except where strictly needed (prefer IDs)
- Raw request bodies from authenticated endpoints

Health endpoints and Admin System Status are designed to report **configuration presence** and **connectivity**, never secret values.

## Local development

- Vite dev server proxies `/health` and `/api` to the API server (port 8080)
- Run API: `pnpm --filter @workspace/api-server run dev`
- Run frontend: `pnpm --filter @workspace/local-order-hub run dev`
- Admin System Status requires a user with `ADMIN` role
