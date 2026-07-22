# TownHub API overview

Short guide for developers working on or calling the TownHub HTTP API. The machine-readable contract is [`lib/api-spec/openapi.yaml`](../lib/api-spec/openapi.yaml).

## Where the reference lives

| Artifact | Role |
|----------|------|
| `lib/api-spec/openapi.yaml` | Source of truth for paths, request/response shapes |
| `lib/api-client-react` | Orval-generated TanStack Query hooks (frontend) |
| `lib/api-zod` | Generated Zod schemas used by the API server |

After any OpenAPI change:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Do not hand-edit generated files under `lib/api-client-react/src/generated` or `lib/api-zod/src/generated`.

## Base URL and health

| Environment | API origin (examples) |
|-------------|------------------------|
| Local | `http://localhost:8080` |
| Staging | `https://api-staging.townhub.io` |
| Production | `https://api.townhub.io` |

- Process health: `GET /health`
- OpenAPI-mounted health: `GET /api/healthz` (when routed)

Frontend local Vite proxies `/api` to the API. Deployed web builds set `VITE_API_BASE_URL` to the Railway origin.

## Authentication

- **Clerk bearer tokens** on protected routes: `Authorization: Bearer <session_jwt>`.
- The API uses `@clerk/express` middleware globally; handlers add `requireAuth`, `requireAdmin`, `requireBusinessCatalogAccess`, or ownership checks as needed.
- Roles: `CUSTOMER`, `BUSINESS_OWNER`, `ADMIN`. Owners may manage multiple businesses; always authorize the requested business id.

## Guest order and checkout access

Card and pay-at-pickup guests do not use Clerk for order PII.

1. Pay-at-pickup: `POST /api/orders` → durable order + `accessToken`.
2. Card: `POST /api/checkout/intents` → `pendingCheckoutId` + pending `accessToken` + Stripe URL (no durable order yet).
3. After Stripe: `POST /api/checkout/confirm` with pending id + token → materializes one `PAID` order.
4. Read order: `GET /api/orders/:id?token=…` or header `X-Order-Access-Token`.

**OpenAPI note:** the guest `?token=` query parameter is intentionally *described* in prose rather than modeled as an OpenAPI query parameter (Orval type collisions). Preserve that exception unless the generator issue is fixed and verified.

Missing or unauthorized order access returns **404** (anti-enumeration), not 403, on customer-facing order reads.

Deprecated: `POST /api/checkout/session` always returns 400 — use `/checkout/intents`.

## Conventions

- JSON request/response bodies; Zod validation from generated schemas where available.
- Monetary catalog/order fields are **decimal dollars** in the API (not integer cents), except fields that already document cents (refunds / pending-checkout aggregates).
- One business per cart and per order.
- Stripe Connect (customer orders) and Stripe Billing (business subscriptions) are separate domains and webhook secrets.
- Rate limits apply to write, read, order-lookup, and general routes (`RATE_LIMIT_*` in `.env.example`).
- Errors typically return `{ "error": "…" }` with an appropriate status code; some commerce failures include a `code` field.

## Major route areas

Mounted under `/api` (see `artifacts/api-server/src/routes/`): auth, businesses, products, modifier groups, orders/checkout/webhooks, Stripe Connect, subscriptions, applications, food-truck locations, appointment requests, events, highlights, admin, platform, weather, geo, media, devices, business live events (SSE), internal jobs.

Authorization and payment rules are detailed in [../SECURITY.md](../SECURITY.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design
- [SECURITY.md](../SECURITY.md) — authZ model
- [STRIPE_SETUP.md](STRIPE_SETUP.md) / [STRIPE_BILLING_SETUP.md](STRIPE_BILLING_SETUP.md)
- [TESTING.md](TESTING.md) — how to test API changes
