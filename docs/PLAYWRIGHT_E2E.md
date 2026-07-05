# Playwright E2E Testing

TownHub uses [Playwright](https://playwright.dev/) for end-to-end smoke and regression tests before beta launch. The suite focuses on high-value customer, business owner, and admin workflows — not exhaustive coverage.

## Quick start

1. **Start local servers** (two terminals):

```bash
pnpm --filter @workspace/api-server run dev      # http://localhost:8080
pnpm --filter @workspace/local-order-hub run dev # http://localhost:23032
```

1. **Ensure database and env are ready** — see [SETUP.md](./SETUP.md). At minimum you need `DATABASE_URL`, Clerk keys, and `SESSION_SECRET`.
2. **Run smoke tests**:

```bash
pnpm run test:e2e
```

Other scripts:


| Script                    | Purpose                                |
| ------------------------- | -------------------------------------- |
| `pnpm run test:e2e`       | Headless Chromium smoke/regression run |
| `pnpm run test:e2e:ui`    | Interactive Playwright UI mode         |
| `pnpm run test:e2e:debug` | Step-through debugger                  |


Run a subset:

```bash
pnpm exec playwright test tests/e2e/smoke
pnpm exec playwright test tests/e2e/customer/guest-checkout.spec.ts
```

## Required local servers


| Service         | URL                                              | Health check             |
| --------------- | ------------------------------------------------ | ------------------------ |
| Frontend (Vite) | [http://localhost:23032](http://localhost:23032) | Proxies `/health` to API |
| API (Express)   | [http://localhost:8080](http://localhost:8080)   | `GET /health`            |


Tests fail fast in global setup if the API is not reachable.

## Environment variables


| Variable            | Default                  | Purpose                                      |
| ------------------- | ------------------------ | -------------------------------------------- |
| `E2E_BASE_URL`      | `http://localhost:23032` | Playwright `baseURL`                         |
| `E2E_API_URL`       | `http://localhost:8080`  | Direct API calls in helpers                  |
| `E2E_BUSINESS_SLUG` | *(auto-discover)*        | Pin a specific storefront for checkout tests |


All other vars come from the root `.env` used by the running API and frontend (Clerk, `SESSION_SECRET`, `DATABASE_URL`, etc.).

### Test data requirements

Guest checkout tests need **one active business** that:

- Allows **pay at pickup** (`paymentMode` is `BOTH` or `PAY_AT_PICKUP_ONLY`)
- Has at least one **available product without required modifier groups**

By default, helpers call `GET /api/businesses` and pick the first matching business. Set `E2E_BUSINESS_SLUG` to pin a known storefront (e.g. a dev business you control).

There is **no destructive seed/reset** in the suite — helpers read live API data and create guest orders through the public `POST /api/orders` endpoint.

## Test structure

```
tests/e2e/
  smoke/           # Fast page-load checks
  customer/        # Guest cart and checkout
  owner/           # Business Hub (Clerk auth)
  admin/           # Admin Hub (Clerk auth)
  helpers/         # API, navigation, cart, assertions
  fixtures/        # Shared Playwright fixtures + auth storage
```

## Workflows covered

### Public / customer (always run)

- Homepage loads
- Businesses directory loads
- Storefront loads for a checkout-ready business
- Add item to cart; cart shows subtotal and total
- Guest **pay-at-pickup** checkout completes
- Order confirmation page loads with guest `token` query param

### Business owner (skipped until auth setup)

- Business Hub overview
- Orders, items (products), and settings pages

### Admin (skipped until auth setup)

- Operations Center (system status)
- Business Applications

## Authentication tests

Clerk sign-in is **not automated** in the default smoke run. Owner and admin specs use Playwright [storage state](https://playwright.dev/docs/auth) and **skip with instructions** when auth files are missing.

### Generate stored auth (one-time per machine)

1. Create the auth directory:

```bash
mkdir -p tests/e2e/fixtures/.auth
```

1. **Owner session** — sign in as a user who owns at least one active business:

```bash
pnpm exec playwright codegen http://localhost:23032/sign-in \
  --save-storage=tests/e2e/fixtures/.auth/owner.json
```

Complete Clerk sign-in, navigate to `/dashboard/business`, then close the codegen window.

1. **Admin session** — sign in as a platform admin:

```bash
pnpm exec playwright codegen http://localhost:23032/sign-in \
  --save-storage=tests/e2e/fixtures/.auth/admin.json
```

Complete sign-in, visit `/dashboard/admin/system-status`, then close codegen.

Auth JSON files are gitignored. Re-generate after Clerk key changes or session expiry.

## Stripe checkout

**Not covered.** Real Stripe Checkout requires hosted payment pages and webhook timing that are brittle in local E2E. The suite validates **pay-at-pickup** (`paymentMethod: IN_PERSON`) only.

Future work: mock Stripe or use Stripe test-mode with a dedicated fixture business.

## Debugging failures

1. **HTML report** (after any run):

```bash
pnpm exec playwright show-report
```

1. **Artifacts** (on failure / retry):
  - Screenshots: `test-results/`
  - Traces: `test-results/` (on first retry; use Trace Viewer)
  - Video: retained only on failure
2. **UI mode** — best for developing tests:

```bash
pnpm run test:e2e:ui
```

1. **Debug mode** — breakpoints and step execution:

```bash
pnpm run test:e2e:debug
```

1. **Common issues**


| Symptom                       | Likely cause                                      |
| ----------------------------- | ------------------------------------------------- |
| Global setup timeout          | API not running on `:8080`                        |
| No checkout-ready business    | No pay-at-pickup business with a simple product   |
| Clerk modal blocks navigation | Expected for auth tests without storage state     |
| Order confirmation 404        | `SESSION_SECRET` mismatch or missing token in URL |


## CI (GitHub Actions)

Configuration is CI-ready:

- `forbidOnly` when `CI` is set
- 2 retries on CI
- GitHub reporter
- Single worker on CI to reduce flakiness

Example job steps:

```yaml
- run: pnpm install
- run: pnpm --filter @workspace/db run push
- run: pnpm --filter @workspace/api-server run dev &
- run: pnpm --filter @workspace/local-order-hub run dev &
- run: pnpm run test:e2e
  env:
    CI: true
```

Add Clerk auth secrets and storage-state upload only when you enable owner/admin jobs.

## Extending the suite

1. Add helpers under `tests/e2e/helpers/` for reusable API or UI steps.
2. Prefer role- and label-based selectors; use `data-testid` in the app when text selectors are fragile.
3. Discover test data via API (`findCheckoutBusiness`) instead of hard-coded IDs.
4. Keep smoke tests fast; put slower flows in `customer/` or role-specific folders.
5. Document intentional gaps (Stripe, SMS, email delivery) in this file.

## Intentionally not covered yet

- Stripe card checkout and webhooks
- Signed-in customer `/my-orders` flows
- Business owner CRUD (create product, change order status)
- Admin approve/reject applications
- File uploads, kitchen display, subscriptions
- Mobile viewports (desktop Chromium only for now)
- Email/SMS notification delivery

