# TownHub

TownHub is a multi-tenant local marketplace platform. Customers browse town businesses, place orders, request appointments, and follow community events. Business owners manage catalogs, orders, and subscriptions. Platform admins oversee businesses, plans, and platform settings.

Clay, West Virginia is the first pilot locality. Branding and content are configurable; locality-level data isolation is not a config toggle yet (see [docs/adr/0005-clay-first-pilot-scope.md](docs/adr/0005-clay-first-pilot-scope.md)).

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
- Community events, highlights, food truck locations, WeatherKit weather widget
- Sentry error monitoring (API + frontend)
- Capacitor iOS shell (TestFlight / App Store)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js, TypeScript 5.9 |
| Monorepo | pnpm workspaces |
| Frontend | React 19, Vite, Tailwind, shadcn/ui, wouter, TanStack Query |
| Auth | Clerk (`@clerk/react` + `@clerk/express`) |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod 3, Orval-generated schemas from OpenAPI |
| Payments | Stripe Connect (orders) + Stripe Billing (subscriptions) |
| Media | Supabase Storage (default) or local filesystem (dev) |
| Deploy | Cloudflare Workers (web) + Railway (API) |

---

## Quick Start

```bash
pnpm install
cp .env.example .env    # fill in values — see docs/SETUP.md
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev    # API on :8080
pnpm --filter @workspace/townhub run dev   # frontend on :23032
```

All environment variables live in a **single root `.env`** file. [`.env.example`](.env.example) is the full catalog. The API loads it via `--env-file=../../.env`; Vite reads `VITE_*` vars from the same file during dev.

| Service | Local URL |
|---------|-----------|
| Frontend | http://localhost:23032 |
| API | http://localhost:8080 |
| Health check | http://localhost:8080/health |

Set `APP_BASE_URL=http://localhost:23032` and `VITE_CLERK_PROXY_URL=http://localhost:8080/api/__clerk` for local Clerk proxying.

**First admin:** sign up → visit `/setup` → claim admin access (works once).

---

## Guest Order Access Tokens

Guest users can place pay-at-pickup or card orders without signing in. To protect customer PII:

1. Pay-at-pickup uses `POST /api/orders`, which creates the order and returns an order `accessToken`.
2. Card checkout uses `POST /api/checkout/intents`, which creates a pending checkout—not an order—and returns `pendingCheckoutId`, a pending-checkout `accessToken`, and the Stripe URL.
3. After Stripe returns, `POST /api/checkout/confirm` receives the pending ID and token, verifies payment, materializes the paid order idempotently, and returns its order token.
4. The confirmation page loads the order at `/order/:id?token=…`.

Tokens are HMAC-signed with `SESSION_SECRET` (required in production, ≥ 32 characters). See [SECURITY.md](SECURITY.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/PRD.md](docs/PRD.md) | Product vision, features, roles, plans, acceptance criteria |
| [docs/SETUP.md](docs/SETUP.md) | Local development setup and troubleshooting |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design for developers |
| [docs/API.md](docs/API.md) | API overview, auth, conventions, OpenAPI pointer |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema domains, push rules, backups pointer |
| [docs/TESTING.md](docs/TESTING.md) | Unit tests, CI coverage, Playwright entry |
| [SECURITY.md](SECURITY.md) | Auth, authorization, and security model |
| [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) | Day-to-day web + iOS release flow |
| [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md) | Current release blockers and validation evidence |
| [PRODUCTION.md](PRODUCTION.md) | Production deployment and verification checklist |
| [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) | Staging and production isolation; Railway/Cloudflare var checklists |
| [docs/IOS_APP.md](docs/IOS_APP.md) | iOS, TestFlight, and App Store workflow |
| [docs/PLAYWRIGHT_E2E.md](docs/PLAYWRIGHT_E2E.md) | End-to-end test setup and workflows |
| [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) | Stripe Connect (customer payments) |
| [docs/STRIPE_BILLING_SETUP.md](docs/STRIPE_BILLING_SETUP.md) | Stripe Billing (business subscriptions) |
| [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) | Notification delivery, live alerts, push |
| [docs/WEATHERKIT.md](docs/WEATHERKIT.md) | Apple WeatherKit setup |
| [docs/PRODUCTION_MONITORING.md](docs/PRODUCTION_MONITORING.md) | Sentry, health checks, logs, and alerts |
| [docs/DATABASE_BACKUP_AND_RECOVERY.md](docs/DATABASE_BACKUP_AND_RECOVERY.md) | Backups, R2, restore runbook |
| [docs/SECURITY_INCIDENT_RESPONSE.md](docs/SECURITY_INCIDENT_RESPONSE.md) | First-hour incident steps |
| [docs/ACCOUNT_DELETION_RUNBOOK.md](docs/ACCOUNT_DELETION_RUNBOOK.md) | Account deletion queue and SQL helpers |
| [docs/TECH_DEBT.md](docs/TECH_DEBT.md) | Known scale and maintainability backlog |
| [AGENTS.md](AGENTS.md) | Repository working rules for humans and agents |

Provider and legal docs also live under `docs/` (Resend, Twilio, App Store privacy, legal launch, outreach).

---

## Repository Layout

```
artifacts/
  api-server/       Express API
  townhub/          React frontend + Capacitor iOS
  mockup-sandbox/   Isolated UI prototyping (not production)
lib/
  api-spec/         OpenAPI contract (source of truth)
  api-client-react/ Generated TanStack Query hooks
  api-zod/          Generated Zod schemas
  db/               Drizzle schema and push scripts
tests/e2e/          Playwright end-to-end tests
docs/               Product and operations documentation
```

Regenerate API clients after OpenAPI changes:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Known Limitations

- Cart state is `localStorage` only (no server-side cart)
- List endpoints return full result sets (no pagination)
- Business Hub live events use an in-process event bus and therefore require a
  single API instance until shared pub/sub is added

Active development is tracked in **Linear**. Release blockers and evidence live in [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md).
