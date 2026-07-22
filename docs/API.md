# API

The source of truth is [OpenAPI](../lib/api-spec/openapi.yaml). Generated Zod schemas and React Query hooks must never be edited directly.

## Change process

1. Update OpenAPI.
2. Run `pnpm --filter @workspace/api-spec run codegen`.
3. Implement the route with server-side authorization and validation.
4. Use generated frontend hooks/types where possible.
5. Add route and UI tests, including negative authorization cases.

## Authentication and authorization

Protected calls use a Clerk bearer token. The API—not UI visibility—enforces admin roles, business ownership, subscription feature access, and business status. Public responses must not expose private customer or provider data.

Guest order lookups use a signed `token` query value or `X-Order-Access-Token` header. This remains a documented OpenAPI exception because modeling the query parameter creates an Orval collision.

## Checkout

- `POST /orders` creates pay-at-pickup orders.
- `POST /checkout/intents` creates a pending card checkout, never an unpaid order.
- `POST /checkout/confirm` is an idempotent payment-confirmation safety net.
- `POST /checkout/webhook` verifies Stripe signatures using the raw request body.

`POST /checkout/session` is retired and returns an error. It remains temporarily documented as deprecated while old clients are removed.

## Compatibility

Deprecated endpoints and fields require an owner, evidence of no remaining clients/data, a removal date, and a tested removal change. See [ARCHITECTURE.md](ARCHITECTURE.md) for current limits.
