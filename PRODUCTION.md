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

The app can proxy Clerk FAPI through `/api/__clerk` (see `artifacts/api-server` and frontend `ClerkProvider`).

- **Default (custom domain):** set proxy URL in Clerk dashboard to `https://yourdomain.com/api/__clerk`, or remove the proxy entirely (delete middleware from `app.ts` and `proxyUrl` from `ClerkProvider`).
- **Some hosts** (e.g. Replit) may configure the proxy URL automatically — confirm `VITE_CLERK_PROXY_URL` matches your deployment docs.

---

## 2. Environment Variables

Set all secrets in your **hosting provider's secret manager** (environment variables UI). Never commit production values.

Examples: Railway variables, Render environment, Fly secrets, Replit Secrets.

### Required

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Production Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | Production Clerk publishable key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend build-time publishable key |
| `SESSION_SECRET` | Guest order access token signing (≥ 32 chars) |
| `APP_BASE_URL` | Public frontend URL (e.g. `https://yourdomain.com`) |
| `VITE_API_BASE_URL` | Absolute API origin when frontend and API are on different hosts (e.g. `https://town-hub-production.up.railway.app`). Required for Netlify + Railway. Leave empty for same-origin / Vite proxy. |
| `CORS_ALLOWED_ORIGINS` | Optional comma-separated extra browser origins for API CORS in production (preview/staging). `APP_BASE_URL` origin is always included. |

**Build-time frontend variables** (`VITE_*`) must be set **before** the frontend build step on your host. Changing them later requires a rebuild, not just a restart.

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
| `BOOTSTRAP_TOKEN` | Optional — required for first-admin bootstrap when set |
| `APP_VERSION`, `GIT_COMMIT_SHA` | Optional build metadata in System Status |

### Rate limiting (optional overrides)

| Secret | Default |
|--------|---------|
| `RATE_LIMIT_WRITE_MAX` | 60 requests per window |
| `RATE_LIMIT_WRITE_WINDOW_MS` | 900000 (15 min) |
| `RATE_LIMIT_READ_MAX` | 120 |
| `RATE_LIMIT_READ_WINDOW_MS` | 900000 |
| `RATE_LIMIT_ORDER_LOOKUP_MAX` | 30 |
| `RATE_LIMIT_GENERAL_MAX` | 300 |
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

**Backups are required before accepting real orders.** Define provider backups, retention, and restore steps in [docs/DATABASE_BACKUP_AND_RECOVERY.md](docs/DATABASE_BACKUP_AND_RECOVERY.md). Minimum for launch:

1. Production `DATABASE_URL` points at a **managed PostgreSQL provider** (not a development database or temporary host database).
2. **Automated daily backups** enabled in the provider dashboard.
3. At least one **restore drill** to a non-production database.
4. Optional but recommended: monthly encrypted `pg_dump` stored off-host (commands in the backup doc).

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

1. Deploy the application (see §7).
2. Sign up with your admin email at `/sign-up`.
3. Visit `/setup` and click **Claim Admin Access** (works once).
4. After bootstrap, `/setup` redirects away and the setup nav link disappears.

`GET /api/admin/bootstrap-status` drives the UI; `POST /api/admin/bootstrap` returns 403 once an admin exists. When `BOOTSTRAP_TOKEN` is set, include it in the bootstrap request (see [SECURITY.md](SECURITY.md)).

---

## 6. Pre-Launch Freeze / Go-No-Go

Complete this checklist **before** deploying to production. If any required item fails, **no-go** until resolved.

### Quality gates

- [ ] `pnpm run typecheck` passes
- [ ] `pnpm --filter @workspace/api-server run test` passes
- [ ] `pnpm --filter @workspace/townhub run test` passes
- [ ] `pnpm run test:e2e` passes (Playwright smoke/regression — see [docs/PLAYWRIGHT_E2E.md](docs/PLAYWRIGHT_E2E.md))

### Production readiness

- [ ] Production environment variables configured in the host secret manager
- [ ] Build-time `VITE_*` variables set before the frontend build
- [ ] Production database backups enabled and visible in provider dashboard
- [ ] Restore drill completed ([docs/DATABASE_BACKUP_AND_RECOVERY.md](docs/DATABASE_BACKUP_AND_RECOVERY.md))
- [ ] Stripe live (or agreed beta) test transaction completed end-to-end
- [ ] Resend verified (test email) if email notifications enabled
- [ ] Twilio verified (test SMS) if SMS notifications enabled
- [ ] Sentry DSN configured for API and frontend builds
- [ ] Git release tag created for this deploy (see below)

### Release tagging

Tag the commit you are deploying so rollbacks and incident triage have a clear reference:

```bash
git tag v1.0.0-beta1
git push origin v1.0.0-beta1
```

Set optional env vars `APP_VERSION` and `GIT_COMMIT_SHA` to match the tag/commit in production for Admin → System Status.

**Go:** all required boxes checked → proceed to §7 Deploy, then §9 Post-Deploy Verification.

**No-go:** fix failures, re-run gates, create a new tag if the commit changed.

---

## 7. Deploy

TownHub is a monorepo: Express API (`artifacts/api-server`) and Vite frontend (`artifacts/townhub`). Your host may run both in one service or split them — follow your provider's model.

### Generic deployment steps

1. **Deploy the backend/API** — Node process serving Express on `PORT` (default `8080`). Ensure `NODE_ENV=production`.
2. **Deploy the frontend** — build `artifacts/townhub` and serve static assets, or use your host's combined build pipeline.
3. **Set production environment variables** in the host secret manager (see §2). Include `DATABASE_URL`, Clerk, `SESSION_SECRET`, `APP_BASE_URL`, Stripe, media, and monitoring keys.
4. **Set build-time frontend variables** (`VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` when frontend and API hosts differ, `VITE_SENTRY_DSN`, etc.) **before** running the frontend build.
5. **Attach production or custom domain** — point DNS to your host; set `APP_BASE_URL` to the public HTTPS URL. For Netlify/Cloudflare Pages + Railway: set the frontend host’s `VITE_API_BASE_URL` to the Railway API origin, and set Railway `APP_BASE_URL` to the frontend URL so CORS allows the browser.
6. **Restart or redeploy the application** after any environment variable change (runtime secrets need a restart; `VITE_*` changes need a rebuild).
7. **Apply database schema** if this release includes schema changes:
   ```bash
   DATABASE_URL=<production_url> pnpm --filter @workspace/db run push
   ```
8. **Verify health** — `GET https://your-api-host/health` (or same-origin `/health`) returns `200` before announcing launch.

### Example: Cloudflare Pages (frontend)

Repo root is a pnpm monorepo. Use these Pages settings:

| Setting | Value |
|--------|--------|
| Root directory | *(leave empty — repo root)* |
| Build command | `pnpm --filter @workspace/townhub run build` |
| Build output directory | `artifacts/townhub/dist/public` |
| Deploy command | `npx wrangler pages deploy` |
| Node version | `22` |
| pnpm version | `10.11.1` (matches `packageManager` in root `package.json`) |

Build-time env vars: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` (Railway API origin), optional `VITE_SENTRY_DSN`.

**Use `wrangler pages deploy`, not `wrangler deploy`.** Plain `wrangler deploy` is for Workers and fails in this monorepo with “application detection logic has been run in the root of a workspace”. Root `wrangler.toml` already sets `name` and `pages_build_output_dir`, so `npx wrangler pages deploy` is enough.

Explicit form (same result):

```bash
npx wrangler pages deploy artifacts/townhub/dist/public --project-name=townhub
```

**If deploy fails with `Authentication error [code: 10000]`:** Wrangler is using `CLOUDFLARE_API_TOKEN` from the project env, and that token cannot deploy Pages. Fix:

1. [Create an API token](https://dash.cloudflare.com/profile/api-tokens) → **Create Custom Token** with:
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Account** → **Account Settings** → **Read**
   - **User** → **User Details** → **Read**
   - Under **Account Resources**, include the account that owns the `townhub` Pages project
2. In the Pages project → **Settings** → **Variables** (or Environment variables), set:
   - `CLOUDFLARE_API_TOKEN` = that token (secret)
   - `CLOUDFLARE_ACCOUNT_ID` = `0cd5139efc19d97edf07b50bbd896dda` (from the build log)
3. Redeploy

Do not reuse a Workers-only or read-only token. Account membership (Super Admin) is separate from API token scopes.

If install fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`:

1. Confirm **Root directory is empty** (repo root). Setting it to `artifacts/townhub` breaks pnpm because `pnpm-workspace.yaml` (where `overrides` live) is no longer found.
2. Clear the Pages **build cache** and retry.
3. Or set env `SKIP_DEPENDENCY_INSTALL=true` and change the build command to:
   `pnpm install --no-frozen-lockfile && pnpm --filter @workspace/townhub run build`

After deploy, confirm `https://YOUR_PAGES_URL/native-sso-callback` shows “Returning to TownHub…” (not a 404), then update Clerk’s mobile SSO allowlist and Capacitor `CAPACITOR_SERVER_URL` / API `APP_BASE_URL` to the new Pages URL.

### Example: Replit deployment

1. Click **Publish** in the Replit workspace.
2. Choose a `.replit.app` subdomain or connect a custom domain.
3. Set all production secrets in **Replit → Secrets**.
4. Set `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_SENTRY_DSN` before publish (build-time).
5. **Republish or restart** after changing secrets or env vars.

---

## 8. Rollback

Use when a deploy causes regressions but the database is healthy. Prefer rolling back **application** layers before touching data.

### Application rollback

1. **Rollback the frontend** to the previous known-good deployment (previous build artifact, host rollback button, or redeploy from the prior git tag).
2. **Rollback the API** to the matching previous release the same way.
3. **Restore previous environment variables** in the secret manager if this deploy changed them — then restart or redeploy.
4. **Do not restore the database** unless data or schema was corrupted. Schema-only issues may be fixable with a forward fix; data loss requires the restore runbook in [docs/DATABASE_BACKUP_AND_RECOVERY.md](docs/DATABASE_BACKUP_AND_RECOVERY.md).

### Post-rollback verification

- [ ] `GET /health` returns `200`
- [ ] Admin → System Status shows healthy database and auth
- [ ] Spot-check guest checkout and owner dashboard
- [ ] Review **Sentry** for new errors since rollback
- [ ] **Communicate** to beta businesses if there was user-visible downtime or order impact

To roll back to a tagged release:

```bash
git checkout v1.0.0-beta1
# redeploy from this commit on your host
```

---

## 9. Post-Deploy Verification

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
- [ ] `/order/:id?token=…` loads confirmation (without token → 404)
- [ ] `POST /api/checkout/session` without token → 404; with `accessToken` → Stripe URL

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
- [ ] Guest order email/SMS links include `?token=` and open the order confirmation page

### Monitoring

- [ ] `GET /health` returns 200
- [ ] Admin → System Status shows healthy database and auth
- [ ] Sentry receives test error in staging (dev-only debug routes are not available in production)
- [ ] Configure external uptime monitor on `/health`
- [ ] Production database backups enabled; restore drill documented ([DATABASE_BACKUP_AND_RECOVERY.md](docs/DATABASE_BACKUP_AND_RECOVERY.md))

### Security smoke tests

- [ ] Unauthenticated `POST /api/businesses/:id/categories` → 401
- [ ] Non-admin `POST /api/businesses/register` → 403
- [ ] Non-admin `POST /api/events` → 403
- [ ] Order on inactive business → 400
- [ ] Non-owner `POST /api/businesses/:id/food-truck-locations` → 403 or 404
- [ ] Owner cannot `PUT`/`DELETE` another business's food-truck location id → 404

---

## 10. Remaining Considerations

Post-beta hardening and scaling items — not blockers for first-town launch after the security pass.

| Item | Notes |
|------|-------|
| Pagination | List endpoints return full result sets; add cursor/limit before high order volume |
| Cart persistence | Client-side `localStorage` only — cart is lost when the browser storage is cleared |
| Guest token TTL / revocation | v2 tokens expire after 90 days (legacy v1 still accepted); shorter TTL or server-side revocation can wait until post-beta |
| Schema change rollback | Drizzle `push` workflow has no in-repo migrations — run pre-push dumps and restore drills before large schema changes at scale ([DATABASE_BACKUP_AND_RECOVERY.md](docs/DATABASE_BACKUP_AND_RECOVERY.md)) |

Active development tracking: **Linear** (see [PROJECT_TRACKER.md](PROJECT_TRACKER.md)).

---

## Related Documentation

- [docs/SETUP.md](docs/SETUP.md) — local development
- [SECURITY.md](SECURITY.md) — authorization model
- [docs/DATABASE_BACKUP_AND_RECOVERY.md](docs/DATABASE_BACKUP_AND_RECOVERY.md) — backup, restore, and recovery plan
- [docs/PRODUCTION_MONITORING.md](docs/PRODUCTION_MONITORING.md) — health and ops logging
- [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) — notification flows
- [docs/PLAYWRIGHT_E2E.md](docs/PLAYWRIGHT_E2E.md) — E2E test setup
- [docs/SENTRY_SETUP.md](docs/SENTRY_SETUP.md) — error monitoring
