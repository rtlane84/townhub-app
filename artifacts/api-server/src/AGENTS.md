# API Server Guidance

These instructions refine the root `AGENTS.md` for `artifacts/api-server/src`.

## Boundaries

- `routes/` owns HTTP parsing, generated Zod validation, authorization calls, status codes, and orchestration. Keep reusable rules in `lib/`; keep persistence definitions in `lib/db/src/schema`.
- `middlewares/` owns cross-cutting request guards. UI route protection is never a substitute for API authorization.
- Use `@workspace/api-zod` for contract schemas and `@workspace/db` for database access. Change `lib/api-spec/openapi.yaml` first when an API shape changes; never hand-edit generated API files.
- Provider failures after a committed domain action must be logged and isolated. Do not place customer PII, guest tokens, Stripe IDs, webhook payloads, or provider secrets in logs or SSE events.

## Authentication and tenancy

- Clerk identity enters through global `clerkMiddleware`; protected handlers use `requireAuth`, `requireAdmin`, `requireRole`, `requireBusinessCatalogAccess`, or `authorizeBusinessOwnerOrAdmin` as appropriate.
- Roles are `CUSTOMER`, `BUSINESS_OWNER`, and `ADMIN`. Owners can own multiple businesses. Always authorize the requested business ID; never rely on the currently selected frontend business.
- Preserve disabled-user enforcement and admin safeguards. Public catalog reads exclude inactive/archived businesses. Public order and appointment writes must enforce commerce state and feature gates on the server.
- Guest order/pending-checkout access uses signed HMAC tokens. Test missing, malformed, tampered, expired, wrong-resource, and valid tokens. Never log or emit tokens outside the authorized customer URL/response.

## Orders and payments

- Pay-at-pickup: `POST /api/orders` creates the order immediately with `paymentMethod=IN_PERSON` and pending payment.
- Card: `POST /api/checkout/intents` persists `pending_checkouts`, creates Checkout on the connected account, and creates no durable order until verified payment. Keep `pendingCheckoutId`, session, connected account, paid state, and amount checks in the materialization path.
- `createStripeCheckoutSession` must continue passing `{ stripeAccount: connectedAccountId }`; these are Connect direct charges. Platform subscription Checkout must not pass a connected account.
- `/api/checkout/webhook` needs `express.raw()` before JSON parsing. Verify against the correct Connect/platform secrets, route by event metadata/type, and retain `stripe_webhook_events` deduplication.
- Refunds require owner/admin authorization, remaining-amount validation, a persisted audit record before the provider call, connected-account context, a unique Stripe idempotency key, and webhook reconciliation. Never mark a refund successful merely because a request was accepted.
- Preserve one business per order. Recalculate products/options, availability, fulfillment, tax, fees, and totals on the server; never trust cart totals.

## Notifications and live events

- Add domain-event behavior to the existing orchestrators (`notification-service.ts`, `notifications.ts`, `application-notifications.ts`, or `subscription-notifications.ts`) and delivery technology to adapters (`notification-delivery.ts`, `push-delivery.ts`, `push/`).
- Delivery is fire-and-forget and every attempt is logged. Operational owner channel toggles cover new orders and appointments. Critical Stripe/refund alerts remain mandatory email plus app push.
- Publish minimal business-scoped SSE events only after successful domain changes. The in-process bus supports one API instance; shared pub/sub is required before claiming horizontal live-update support.

## Verification

Run from the repository root:

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run test
pnpm run build
```

Run relevant Playwright workflows for auth, checkout, refunds, appointments, or feature gates when their documented services/accounts are available. Add negative authorization and idempotency tests for sensitive changes.
