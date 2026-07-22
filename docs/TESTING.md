# Testing

How to run TownHub tests and what each layer covers.

## Quick commands

From the repository root:

```bash
# Typecheck (libs + packages as configured)
pnpm run typecheck

# API unit tests
pnpm --filter @workspace/api-server run test

# Frontend unit tests
pnpm --filter @workspace/townhub run test

# Playwright E2E (requires local API + frontend, or configured remote URLs)
pnpm run test:e2e
```

Targeted examples:

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/townhub run typecheck
pnpm exec playwright test tests/e2e/smoke/public-pages.spec.ts
```

## What is covered

| Layer | Location | Coverage |
|-------|----------|----------|
| API unit | `artifacts/api-server/**/*.test.ts` | AuthZ, orders/refunds, Stripe helpers, notifications, weather, schema contracts, rate limits |
| Frontend unit | `artifacts/townhub/src/**/*.test.ts` | Mostly `src/lib` helpers and hooks (few full-page tests) |
| E2E | `tests/e2e/` | Smoke, customer (guest checkout), owner, admin, workflows (Stripe, refunds, appointments, feature gating) |

There is **no** `pnpm run lint` script in this repository.

## CI vs local

GitHub Actions [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) on pull requests and `main`:

- Library/package typecheck
- API and frontend unit tests
- Production build
- `audit:health`

**Playwright is not in CI.** Run it locally or against a configured staging environment when checkout, auth, or payments change. Also see CodeQL, uptime health check, and DB backup/restore workflows under `.github/workflows/`.

## Playwright environment

Defaults assume local servers (`http://localhost:23032` and `http://localhost:8080`). Optional overrides (also commented in [`.env.example`](../.env.example)):

| Variable | Purpose |
|----------|---------|
| `E2E_BASE_URL` | Playwright `baseURL` |
| `E2E_API_URL` | Direct API host for helpers (required when the SPA host is not the API) |
| `E2E_BUSINESS_SLUG` | Pin a storefront for checkout tests |
| `E2E_STRIPE_CHECKOUT` | Set `1` to enable Stripe card + refund workflows |

Full setup, fixtures, Stripe notes, and intentional gaps: [PLAYWRIGHT_E2E.md](PLAYWRIGHT_E2E.md).

## Expectations by change type

Match validation to risk (from [AGENTS.md](../AGENTS.md)):

- API route / auth / checkout → API tests + relevant Playwright when env supports it
- Shared OpenAPI contract → codegen + library and affected package typechecks + targeted tests
- Frontend page/component → TownHub typecheck + targeted unit test; visual check when UI changes
- Docs only → review links/commands; `git diff --check`

Do not fabricate a passing result when a required secret or service is unavailable — run every safe local check and state the limitation.
