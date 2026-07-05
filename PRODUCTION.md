# TownHub — Production Checklist

Follow these steps before going live. For local setup see [docs/SETUP.md](docs/SETUP.md). For architecture see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). For security behavior see [SECURITY.md](SECURITY.md).

---

## 1. Clerk Auth

### Create a Production instance

1. Log in to [clerk.com](https://clerk.com) and open your application.
2. Switch from **Development** to **Production** instance.
3. Copy the **Production** Publishable Key and Secret Key.

### Set allowed origins and redirect URLs

- **Allowed Origins:** production domain (e.g. `https://yourdomain.com`)
- **Redirect URLs:** `https://yourdomain.com/sign-in`, `https://yourdomain.com/sign-up`

### Clerk proxy

The app proxies Clerk FAPI through `/api/__clerk`.

- **Replit:** configured automatically.
- **Custom domain / self-hosted:** set proxy URL in Clerk dashboard to `https://yourdomain.com/api/__clerk`, or remove the proxy entirely (delete middleware from `app.ts` and `proxyUrl` from `ClerkProvider`).

---

## 2. Environment Variables

Set all secrets in your hosting provider (Replit Secrets, Fly secrets, etc.). Never commit production values.

### Required

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Production Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | Production Clerk publishable key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend build-time publishable key |
| `SESSION_SECRET` | Guest order access token signing (≥ 32 chars) |
| `APP_BASE_URL` | Public frontend URL (e.g. `https://yourdomain.com`) |
| `CORS_ALLOWED_ORIGINS` | Optional comma-separated extra browser origins for API CORS in production (preview/staging). `APP_BASE_URL` origin is always included. |

### Stripe (customer payments + business subscriptions)

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | Platform secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret for `POST /api/checkout/webhook` |

See [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) (Connect) and [docs/STRIPE_BILLING_SETUP.md](docs/STRIPE_BILLING_SETUP.md) (subscriptions).

### Email

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | Verified sender (e.g. `TownHub <orders@yourdomain.com>`) |

Or SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. See [docs/RESEND_SETUP.md](docs/RESEND_SETUP.md).

### SMS (optional)

| Secret | Purpose |
|--------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | E.164 sending number |

See [docs/TWILIO_SETUP.md](docs/TWILIO_SETUP.md).

### Media storage

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side upload key |
| `SUPABASE_STORAGE_BUCKET` | Public bucket name |

### Monitoring and operations

| Secret | Purpose |
|--------|---------|
| `SENTRY_DSN` | API error monitoring |
| `VITE_SENTRY_DSN` | Frontend error monitoring (build-time) |
| `JOB_SECRET` | Auth for internal cron jobs (trial reminders) |
| `PLATFORM_ADMIN_EMAIL` | Subscription operational alert recipients |
| `APP_VERSION`, `GIT_COMMIT_SHA` | Optional build metadata in System Status |

### Rate limiting (optional overrides)

| Secret | Default |
|--------|---------|
| `RATE_LIMIT_WRITE_MAX` | 60 requests per window |
| `RATE_LIMIT_WRITE_WINDOW_MS` | 900000 (15 min) |
| `RATE_LIMIT_READ_MAX` | 120 |
| `RATE_LIMIT_READ_WINDOW_MS` | 900000 |
| `RATE_LIMIT_DISABLED` | `false` |
| `RATE_LIMIT_TRUST_PROXY` | `true` in production |

### CORS (production)

In production, the API accepts credentialed browser requests only from:

- The origin derived from `APP_BASE_URL`
- Additional origins in `CORS_ALLOWED_ORIGINS` (comma-separated preview/staging hosts)

Development (`NODE_ENV !== production`) continues to reflect any `Origin` for local and iframe preview convenience. See [SECURITY.md](SECURITY.md).

---

## 3. Stripe

### Connect (customer card payments)

Each business connects via **Business Dashboard → Settings → Payments**. Online card checkout requires a connected account.

- Register webhook: `https://yourdomain.com/api/checkout/webhook`
- Events: `checkout.session.completed`, `account.updated`
- Pay-at-pickup works without Stripe

Mock mode (no `STRIPE_SECRET_KEY`) is **blocked in production**.

Guide: [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md).

### Billing (business subscriptions)

Same webhook endpoint handles subscription events. Configure Stripe Products/Prices per plan in Admin → Plans.

Guide: [docs/STRIPE_BILLING_SETUP.md](docs/STRIPE_BILLING_SETUP.md).

---

## 4. Database

Drizzle push-based workflow:

```bash
DATABASE_URL=<production_url> pnpm --filter @workspace/db run push
```

**Review the SQL Drizzle prints before confirming.** Do not approve destructive changes (drops, column removals, enum rewrites) without explicit review. If Drizzle reports destructive changes you did not intend, stop and investigate.

Set up automated daily backups before accepting real orders.

For production traffic, use a connection pooler (PgBouncer, Neon pooler, Supabase pooler) in front of PostgreSQL. The API also configures a small server-side `pg` pool (see [docs/OPERATIONS.md](docs/OPERATIONS.md)).

### Connection pool env vars (optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_POOL_MAX` | `10` | Max connections in the API `pg` pool |
| `DATABASE_CONNECTION_TIMEOUT_MS` | `10000` | Fail if a connection cannot be acquired in time |
| `DATABASE_IDLE_TIMEOUT_MS` | `30000` | Close idle clients after this duration |
| `DATABASE_QUERY_TIMEOUT_MS` | `30000` | PostgreSQL `statement_timeout` per connection (`0` disables) |

Local development works without setting these.

---

## 5. Admin Bootstrap (first deploy)

1. Deploy the app.
2. Sign up with your admin email at `/sign-up`.
3. Visit `/setup` and click **Claim Admin Access** (works once).
4. After bootstrap, `/setup` redirects away and the setup nav link disappears.

`GET /api/admin/bootstrap-status` drives the UI; `POST /api/admin/bootstrap` returns 403 once an admin exists.

---

## 6. Deploy on Replit

1. Click **Publish** in the Replit workspace.
2. Choose a `.replit.app` subdomain or connect a custom domain.
3. Set all production secrets in **Replit → Secrets**.
4. `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_SENTRY_DSN` are build-time — set before publish.

---

## 7. Post-Deploy Verification

### Core

- [ ] `/` loads with correct theme colors
- [ ] `/sign-up` and `/sign-in` work (Clerk production keys)
- [ ] `/setup` bootstrap completes (first deploy only)
- [ ] `/businesses` returns active businesses
- [ ] Admin dashboard accessible only with ADMIN role
- [ ] Non-admin `GET /api/admin/users` returns 403

### Guest checkout and tokens

- [ ] Guest can add to cart and place a pay-at-pickup order
- [ ] Order response includes `accessToken`
- [ ] `/order/:id?token=…` loads confirmation (without token → 403)
- [ ] `POST /api/checkout/session` without token → 403; with `accessToken` → Stripe URL

### Stripe Connect

- [ ] Business completes Connect onboarding
- [ ] Card checkout completes; webhook marks order `PAID`
- [ ] Pay-at-pickup order stays `PENDING` (no Stripe)

### Stripe Billing

- [ ] Business can subscribe via checkout or admin assignment
- [ ] Subscription webhooks update `business_subscriptions`
- [ ] Feature gates block ordering when `online_ordering` disabled

### Refunds and taxes

- [ ] Owner can issue refund on paid Stripe order
- [ ] Order totals show tax when products are taxable

### Prep-time estimates

- [ ] Storefront shows prep estimate for cart (`POST /api/orders/prep-estimate`)

### Notifications

- [ ] Order status change sends email when Resend configured
- [ ] Owner SMS alert fires when Twilio configured
- [ ] Application approval email sends
- [ ] Admin → System Status shows notification logs

### Monitoring

- [ ] `GET /health` returns 200
- [ ] Admin → System Status shows healthy database and auth
- [ ] Sentry receives test error in staging (dev-only debug routes are not available in production)
- [ ] Configure external uptime monitor on `/health`

### Security smoke tests

- [ ] Unauthenticated `POST /api/businesses/:id/categories` → 401
- [ ] Non-admin `POST /api/businesses/register` → 403
- [ ] Non-admin `POST /api/events` → 403
- [ ] Order on inactive business → 400

---

## 8. Remaining Considerations

| Item | Notes |
|------|-------|
| Guest notification links | Email/SMS use `/order/{id}` without access token — guests may need token from checkout flow |
| Pagination | List endpoints return full result sets |
| Food-truck ownership | Location mutations verify auth but not per-business ownership |
| Cart persistence | Client-side `localStorage` only |

Active development tracking: **Linear** (see [PROJECT_TRACKER.md](PROJECT_TRACKER.md)).

---

## Related Documentation

- [docs/SETUP.md](docs/SETUP.md) — local development
- [SECURITY.md](SECURITY.md) — authorization model
- [docs/PRODUCTION_MONITORING.md](docs/PRODUCTION_MONITORING.md) — health and ops logging
- [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) — notification flows
- [docs/SENTRY_SETUP.md](docs/SENTRY_SETUP.md) — error monitoring
