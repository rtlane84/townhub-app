# LocalOrderHub — Production Checklist

Follow these steps before going live. Work through them top to bottom.

---

## 1. Clerk Auth

### Create a Production instance
1. Log in to [clerk.com](https://clerk.com) and open your application.
2. Switch from the **Development** instance to a **Production** instance (top-left toggle in the Clerk dashboard).
3. Copy the **Production** Publishable Key and Secret Key — these are different from your dev keys.

### Set allowed origins and redirect URLs
- **Allowed Origins**: add your production domain (e.g. `https://yourdomain.com`)
- **Redirect URLs**: add `https://yourdomain.com/sign-in` and `https://yourdomain.com/sign-up`

### Clerk proxy (keep or remove)
The app currently proxies all Clerk FAPI calls through `/api/__clerk`. This works on Replit auto-domains.

- **Staying on Replit**: no changes needed. The proxy is configured automatically.
- **Custom domain / self-hosted**: either keep the proxy (set `proxyUrl` in Clerk dashboard to `https://yourdomain.com/api/__clerk`) or remove it entirely:
  1. Delete `clerkProxyMiddleware` from `artifacts/api-server/src/app.ts`
  2. Remove `proxyUrl` from `ClerkProvider` in `artifacts/local-order-hub/src/App.tsx`
  3. Remove `VITE_CLERK_PROXY_URL` from the frontend env

### Required environment variables
```
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

---

## 2. Stripe Connect Payments

See **[docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md)** for platform Connect setup (Part A) and per-business onboarding (Part B).

Each business connects its own Stripe account via **Business Dashboard → Settings → Payments**. Online card checkout requires a connected account; pay-at-pickup works without Stripe.

### Without Stripe (mock mode — dev only)
If `STRIPE_SECRET_KEY` is not set, checkout returns a mock success URL. Orders stay `paymentStatus: PENDING`. **Mock mode is blocked in production.**

### With Stripe (test or live)
Set platform `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, register the platform webhook, and have each business complete Connect onboarding before accepting online card payments.

---

## 3. Email Notifications (Resend or SMTP)

See **[docs/RESEND_SETUP.md](docs/RESEND_SETUP.md)** for domain verification, API keys, env vars, and testing. **[docs/TWILIO_SETUP.md](docs/TWILIO_SETUP.md)** covers optional owner SMS alerts.

Order status change emails are sent via `artifacts/api-server/src/lib/notifications.ts`. Without an email provider configured, notifications are logged to the DB but not delivered.

### Option A — Resend (recommended)
Follow [docs/RESEND_SETUP.md](docs/RESEND_SETUP.md). Set `RESEND_API_KEY` and `RESEND_FROM`.

### Option B — SMTP
Set the following (values depend on your provider):
```
SMTP_HOST=smtp.yourmailprovider.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=orders@yourdomain.com
```

### Trigger points
Currently the following events send notifications (when a provider is configured):
- Order status changes (`PATCH /api/orders/:id/status`)

**Not yet implemented** (see `PRODUCTION.md` — Remaining Work):
- Business application approved/rejected emails

---

## 4. Database

### Schema
Drizzle ORM uses a push-based workflow — there are no migration files.

```bash
# Apply the current schema to the production DB
DATABASE_URL=<production_url> pnpm --filter @workspace/db run push
```

> **Warning**: `db push` on an existing production DB will attempt to apply all pending schema changes. Review the diff it prints before confirming. For large data sets, prefer generating SQL with `drizzle-kit generate` and applying it manually.

### Backups
Set up automated daily backups before accepting real orders. On Replit, use the built-in database backup export. Self-hosted: configure `pg_dump` on a cron.

### Connection pooling
For production traffic, consider using a connection pooler (e.g. PgBouncer or Neon's built-in pooler) between the app and Postgres. The current app uses a plain `pg.Pool` with a default of 10 connections.

---

## 5. Admin Bootstrap (first deploy)

The first user to sign up can promote themselves to admin via `/setup`. This endpoint **only works once** — if any admin already exists it returns 403.

Steps:
1. Deploy the app.
2. Sign up with your admin email at `/sign-up`.
3. Visit `/setup` and click **Bootstrap Admin**.
4. The `/setup` page should be removed or access-restricted after this step (not yet implemented — see Remaining Work).

---

## 6. Publish / Deploy on Replit

1. Open the workspace and click **Publish** in the top bar.
2. Choose a `.replit.app` subdomain or connect a custom domain.
3. Replit automatically builds, hosts, and TLS-terminates the app.
4. Set all production secrets in **Replit → Secrets** (not in `.env` files).

### Environment variables to set in Replit Secrets
| Secret | Value |
|---|---|
| `DATABASE_URL` | Auto-provisioned by Replit DB (already set) |
| `CLERK_SECRET_KEY` | Production Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | Production Clerk publishable key |
| `SESSION_SECRET` | Random string ≥ 32 chars |
| `STRIPE_SECRET_KEY` | Live Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | (optional) Resend API key |

> `VITE_CLERK_PUBLISHABLE_KEY` is a frontend build-time variable. Set it in the Replit Secrets and the Vite build will pick it up automatically.

---

## 7. Post-Deploy Verification

After deploying, verify the following manually:

- [ ] `/` loads with correct theme colors (confirms DB + platform settings work)
- [ ] `/sign-up` and `/sign-in` work (confirms Clerk production keys are correct)
- [ ] `/setup` is reachable and bootstrap completes (first deploy only)
- [ ] Browsing `/businesses` returns active businesses (confirms DB reads work)
- [ ] Adding to cart and reaching checkout (confirms Stripe key is valid)
- [ ] A test order completes and status updates arrive via webhook (confirms webhook signing)
- [ ] Admin dashboard at `/dashboard/admin` is accessible only with an ADMIN account (confirms role guard)
- [ ] A non-admin account hitting `/api/admin/users` returns 403 (quick `curl` check)

---

## 8. Remaining Work Before Production (Risk Items)

The following known gaps exist and should be addressed before handling real users or money:

| Item | Risk | Location |
|---|---|---|
| `/setup` bootstrap page remains accessible after setup | Low (returns 403 if admin exists) | `pages/setup.tsx` |
| No per-business ownership check on `PATCH /orders/:id/status` | Authenticated non-owner can change any order status | `routes/orders.ts` |
| No real Stripe recurring billing | Plans are manual / display-only | `routes/subscriptions.ts` |
| No email on application approve/reject | Business owners get no notification | `routes/applications.ts` |
| No pagination on list endpoints | DB scans grow unbounded with data | `routes/businesses.ts`, `routes/orders.ts` |
| Product images entered as URLs only | No upload flow | `routes/products.ts` |
