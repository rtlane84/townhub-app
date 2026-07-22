# Local Development Setup

Step-by-step guide for running TownHub from a clean clone. For architecture context see [ARCHITECTURE.md](ARCHITECTURE.md). For security behavior see [../SECURITY.md](../SECURITY.md).

---

## Prerequisites

- **Node.js** 22+ (24 recommended)
- **pnpm** (required — npm/yarn are blocked by `preinstall`)
- **PostgreSQL** database (local or a dedicated development provider database)
- Accounts as needed: [Clerk](https://clerk.com), optional Stripe / Supabase / Resend / Twilio / Sentry

---

## Installation

```bash
git clone <repository-url>
cd townhub-app
pnpm install
```

---

## Environment Variables

Copy the template and fill in values:

```bash
cp .env.example .env
```

All variables live in the **repository root `.env`**. Both the API server and Vite frontend read from this file.

**Full catalog:** [`.env.example`](../.env.example) lists every app/runtime variable (required and optional), plus pointers for E2E, dev scripts, and GitHub backup secrets. Deployed Railway/Cloudflare subsets are in [ENVIRONMENTS.md](ENVIRONMENTS.md#live-variable-checklists-operator-inventory).

### Required for basic local dev

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_PUBLISHABLE_KEY` | Same source |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same publishable key (frontend build-time) |
| `SESSION_SECRET` | Random string ≥ 32 chars (`openssl rand -base64 32`) — signs guest order access tokens |
| `APP_BASE_URL` | `http://localhost:23032` for local dev |
| `VITE_API_BASE_URL` | Leave empty locally (Vite proxies `/api`). In deployed builds set the matching Railway API origin without a trailing slash. |

### Required for media uploads

| Variable | Notes |
|----------|-------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only |
| `SUPABASE_STORAGE_BUCKET` | Public bucket name (e.g. `media`) |

**Dev fallback:** set `MEDIA_STORAGE=local` (optional `MEDIA_UPLOAD_DIR`) to write files to disk without Supabase.

### Optional providers

| Variable | Provider | Setup doc |
|----------|----------|-----------|
| `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_PLATFORM_WEBHOOK_SECRET` | Stripe Connect + Billing | [STRIPE_SETUP.md](STRIPE_SETUP.md), [STRIPE_BILLING_SETUP.md](STRIPE_BILLING_SETUP.md) |
| `RESEND_API_KEY`, `RESEND_FROM` | Email | [RESEND_SETUP.md](RESEND_SETUP.md) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | SMS | [TWILIO_SETUP.md](TWILIO_SETUP.md) |
| `WEATHERKIT_*`, `WEATHER_DEMO_FALLBACK` | Homepage weather | [WEATHERKIT.md](WEATHERKIT.md) |
| `SENTRY_DSN`, `VITE_SENTRY_DSN` | Error monitoring | [PRODUCTION_MONITORING.md](PRODUCTION_MONITORING.md#sentry-setup) |
| `JOB_SECRET` | Internal cron jobs (trial reminders) | [NOTIFICATIONS.md](NOTIFICATIONS.md#subscription-lifecycle-email) |
| `PLATFORM_ADMIN_EMAIL` | Subscription operational alerts | [NOTIFICATIONS.md](NOTIFICATIONS.md#subscription-lifecycle-email) |
| `RATE_LIMIT_*` | API rate limiting | [../SECURITY.md](../SECURITY.md) |

### Local Clerk proxy

```bash
VITE_CLERK_PROXY_URL=http://localhost:8080/api/__clerk
```

Add `localhost` and `localhost:23032` to **Allowed Origins** in the Clerk dashboard.

Do not hardcode a deployed Clerk proxy URL in `App.tsx`; configure it per environment.

---

## Database

TownHub uses Drizzle ORM with a push-based workflow (no migration files in repo).

```bash
# Apply schema to your database
pnpm --filter @workspace/db run push

# Force push when Drizzle prompts for destructive changes (dev only)
pnpm --filter @workspace/db run push-force
```

Run `push` after any schema changes under `lib/db/src/schema/`.

**Always review the SQL preview.** Stop if it proposes unexpected drops, column removals, enum changes, or type rewrites. `push-force` is local-development-only. Production pool variables and rollout checks are documented in [PRODUCTION.md](../PRODUCTION.md).

For production backup and restore planning, see [docs/DATABASE_BACKUP_AND_RECOVERY.md](DATABASE_BACKUP_AND_RECOVERY.md).

---

## Running the Application

Use **two terminals**:

```bash
# Terminal 1 — API (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 23032)
pnpm --filter @workspace/townhub run dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:23032 | Frontend |
| http://localhost:8080/health | API health check |
| http://localhost:8080/api/businesses | API (also proxied through Vite) |

The Vite dev server proxies `/api` and `/health` to port 8080.

### Other commands

```bash
pnpm run typecheck                              # Full monorepo typecheck
pnpm --filter @workspace/api-server run test    # API unit tests
pnpm --filter @workspace/townhub run test   # Frontend unit tests
pnpm --filter @workspace/api-spec run codegen   # Regenerate API hooks + Zod schemas
```

---

## Provider Setup (Summary)

Detailed guides live in `docs/`. Quick pointers:

### Clerk

1. Create a Clerk application (Development instance for local work).
2. Copy publishable and secret keys to `.env`.
3. Set `VITE_CLERK_PROXY_URL` for local proxy (see above).
4. First admin: sign up → `/setup` → claim admin.

**Clerk user ID drift after key changes?** See [DEV_CLERK_RELINK.md](DEV_CLERK_RELINK.md).

### Stripe Connect (customer card payments)

Each business connects its own Stripe account. Platform keys enable Connect onboarding and webhooks.

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_BASE_URL=http://localhost:23032
```

Local webhook forwarding:

```bash
stripe listen --forward-to localhost:8080/api/checkout/webhook
```

Full guide: [STRIPE_SETUP.md](STRIPE_SETUP.md).

### Stripe Billing (business subscriptions)

Uses the same platform Stripe keys and webhook endpoint. See [STRIPE_BILLING_SETUP.md](STRIPE_BILLING_SETUP.md).

### Supabase Storage

1. Create a **public** Storage bucket.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
3. Restart the API after changing env vars.

### Resend (email)

Both `RESEND_API_KEY` and `RESEND_FROM` are required. The from-address must use a verified domain.

Guide: [RESEND_SETUP.md](RESEND_SETUP.md).

### Twilio (SMS)

All three vars required: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.

Guide: [TWILIO_SETUP.md](TWILIO_SETUP.md).

### Sentry

```bash
SENTRY_DSN=...           # API
VITE_SENTRY_DSN=...      # Frontend
```

Debug test endpoints are **development-only** (not mounted in production). See [PRODUCTION_MONITORING.md](PRODUCTION_MONITORING.md#sentry-setup).

---

## Local Development Workflow

1. Edit code in `artifacts/` or `lib/`.
2. API server rebuilds on `pnpm run dev` (esbuild bundle + restart).
3. Frontend hot-reloads via Vite.
4. After OpenAPI changes: `pnpm --filter @workspace/api-spec run codegen`.
5. After schema changes: `pnpm --filter @workspace/db run push`.
6. Run tests before committing: `pnpm --filter @workspace/api-server run test`.

### Multi-business owners

Owners with multiple businesses select the active business in the dashboard. Auth returns `businessIds` from `GET /api/auth/me`.

### Dev Clerk account split

```bash
pnpm --filter @workspace/api-server run assign-dev-clerk-accounts
```

Splits admin and business-owner test accounts. See [DEV_CLERK_RELINK.md](DEV_CLERK_RELINK.md).

---

## Common Troubleshooting

| Symptom | Fix |
|---------|-----|
| `DATABASE_URL must be set` | Create root `.env` with `DATABASE_URL` |
| Clerk fails to load | Verify the environment's allowed origins, keys, and `VITE_CLERK_PROXY_URL` |
| Clerk 401 on API calls locally | Set `VITE_CLERK_PROXY_URL=http://localhost:8080/api/__clerk`; use Bearer token pattern (automatic via `ClerkApiTokenBridge`) |
| Signed in but treated as CUSTOMER | Clerk user ID drift — run [DEV_CLERK_RELINK.md](DEV_CLERK_RELINK.md) |
| Guest order page 403 | Include `?token=` from order creation response |
| Stripe checkout 403 for guest | Pass `accessToken` in checkout session body |
| Media upload 403 | Business owners must pass `?businessId=` they own |
| Email not sending | Both `RESEND_API_KEY` and `RESEND_FROM` required; check Admin → System Status |
| `pnpm run build` fails on mockup-sandbox | Set `PORT` env var or build individual packages |
| Port 23032 in use | Change `PORT` in `townhub/package.json` scripts and update `APP_BASE_URL` |

---

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the system fits together
- [../PRODUCTION.md](../PRODUCTION.md) — deployment
- [../SECURITY.md](../SECURITY.md) — auth and authorization
- [PRODUCTION_MONITORING.md](PRODUCTION_MONITORING.md) — health and ops logging
