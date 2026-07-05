# TownHub

TownHub (LocalOrderHub) is a multi-tenant local marketplace platform. Customers browse town businesses, place orders, request appointments, and follow community events. Business owners manage catalogs, orders, and subscriptions. Platform admins oversee businesses, plans, and platform settings.

---

## Major Capabilities

- Public business directory and storefronts (ordering, appointments, or information-only modes)
- Guest and signed-in checkout with Stripe Connect (per-business) or pay-at-pickup
- Guest order access tokens protecting order PII
- Business owner dashboard (orders, kitchen view, products, categories, modifier groups, appointments, billing)
- Platform admin dashboard (businesses, applications, users, plans, features, events, system status)
- Subscription plans with server-side feature gates (online ordering, appointment requests, etc.)
- Stripe Billing for businesses paying TownHub (separate from Connect order payments)
- Email (Resend/SMTP) and SMS (Twilio) notifications
- Supabase Storage media library with business-scoped uploads
- Community events, highlights, food truck locations, weather widget
- Sentry error monitoring (API + frontend)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js, TypeScript 5.9 |
| Monorepo | pnpm workspaces |
| Frontend | React 18, Vite, Tailwind, shadcn/ui, wouter, TanStack Query |
| Auth | Clerk (`@clerk/react` + `@clerk/express`) |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4, Orval-generated schemas from OpenAPI |
| Payments | Stripe Connect (orders) + Stripe Billing (subscriptions) |
| Media | Supabase Storage (default) or local filesystem (dev) |

---

## Quick Start

```bash
pnpm install
cp .env.example .env    # fill in values — see docs/SETUP.md
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev    # API on :8080
pnpm --filter @workspace/local-order-hub run dev   # frontend on :23032
```

All environment variables live in a **single root `.env`** file. The API loads it via `--env-file=../../.env`; Vite reads `VITE_*` vars from the same file during dev.

| Service | Local URL |
|---------|-----------|
| Frontend | http://localhost:23032 |
| API | http://localhost:8080 |
| Health check | http://localhost:8080/health |

Set `APP_BASE_URL=http://localhost:23032` and `VITE_CLERK_PROXY_URL=http://localhost:8080/api/__clerk` for local Clerk proxying.

**First admin:** sign up → visit `/setup` → claim admin access (works once).

---

## Guest Order Access Tokens

Guest users can place orders without signing in. To protect customer PII:

1. `POST /api/orders` returns an `accessToken` in the response.
2. The confirmation page loads the order at `/order/:id?token=…`.
3. Stripe checkout sends `accessToken` in the `POST /api/checkout/session` body.

Tokens are HMAC-signed with `SESSION_SECRET` (required in production, ≥ 32 characters). See [SECURITY.md](SECURITY.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/SETUP.md](docs/SETUP.md) | Full local setup, env vars, providers, troubleshooting |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design for developers |
| [SECURITY.md](SECURITY.md) | Auth, authorization, and security model |
| [PRODUCTION.md](PRODUCTION.md) | Deployment checklist |
| [PROJECT_TRACKER.md](PROJECT_TRACKER.md) | Project status overview |
| [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) | Stripe Connect (customer payments) |
| [docs/STRIPE_BILLING_SETUP.md](docs/STRIPE_BILLING_SETUP.md) | Stripe Billing (business subscriptions) |
| [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) | Order and appointment notifications |
| [docs/RESEND_SETUP.md](docs/RESEND_SETUP.md) | Email provider setup |
| [docs/TWILIO_SETUP.md](docs/TWILIO_SETUP.md) | SMS provider setup |
| [docs/SENTRY_SETUP.md](docs/SENTRY_SETUP.md) | Error monitoring |
| [docs/PRODUCTION_MONITORING.md](docs/PRODUCTION_MONITORING.md) | Health checks and ops logging |
| [docs/DEV_CLERK_RELINK.md](docs/DEV_CLERK_RELINK.md) | Dev-only Clerk user ID repair |

---

## Repository Layout

```
artifacts/
  api-server/       Express API
  local-order-hub/  React frontend
lib/
  api-spec/         OpenAPI contract (source of truth)
  api-client-react/ Generated TanStack Query hooks
  api-zod/          Generated Zod schemas
  db/               Drizzle schema and push scripts
```

Regenerate API clients after OpenAPI changes:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Known Limitations

- Cart state is `localStorage` only (no server-side cart)
- List endpoints return full result sets (no pagination)
- Guest notification email/SMS links do not yet include access tokens (see [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md))
- Food-truck location mutations verify auth but not per-business ownership

Active development is tracked in **Linear** — see [PROJECT_TRACKER.md](PROJECT_TRACKER.md).
