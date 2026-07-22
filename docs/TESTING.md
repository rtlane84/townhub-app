# Testing

Run the smallest relevant check first, then broaden validation for risky work.

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/townhub run test
pnpm run test:e2e
pnpm run build
```

## What is covered

- API tests cover authorization, guest access, payments, webhooks, notifications, data safety, and route behavior.
- Frontend tests cover key UI behavior and client safety helpers.
- Playwright covers public pages plus customer, owner, admin, and workflow journeys when services and test accounts are configured.

## Playwright

Start API and frontend first. `E2E_BASE_URL` defaults to the local frontend and `E2E_API_URL` to the local API. Owner/admin tests require ignored Clerk storage-state files; Stripe workflows require `E2E_STRIPE_CHECKOUT=1`, a test connected account, and webhook forwarding.

The suite intentionally does not reset production-like data. Use controlled staging data and read [DEVELOPMENT.md](DEVELOPMENT.md) before running state-changing workflows.

## Required checks by change

- Docs: link check and `git diff --check`.
- API/auth/database: API typecheck, focused tests, and relevant Playwright workflow.
- Contract: code generation, library/API/frontend typechecks, and caller tests.
- Payments: API tests plus checkout/refund E2E when safely configured.
