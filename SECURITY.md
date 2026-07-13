# TownHub — Security Model

This document describes how TownHub protects data and operations in the current codebase. For local setup and deployment, see [docs/SETUP.md](docs/SETUP.md) and [PRODUCTION.md](PRODUCTION.md). For system design context, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Authentication

TownHub uses [Clerk](https://clerk.com) for identity. The API applies `@clerk/express` middleware globally; route handlers read `userId` via `getAuth(req)`.

Because the Replit preview runs inside an iframe (blocking `SameSite=Lax` cookies), authenticated API calls pass the Clerk session JWT as an `Authorization: Bearer <token>` header. The frontend `ClerkApiTokenBridge` wires this into all generated hooks and raw fetches.

**Roles** (stored in `users.role`):

| Role | Description |
|------|-------------|
| `CUSTOMER` | Default for signed-in shoppers |
| `BUSINESS_OWNER` | Manages one or more businesses |
| `ADMIN` | Platform operator |

First-run admin promotion: `POST /api/admin/bootstrap` (works only while zero admins exist). When `BOOTSTRAP_TOKEN` is set, the request must include that token (body `token` or header `X-Bootstrap-Token`). Ongoing role changes and account status updates: Admin → Users.

### User account status

TownHub stores an app-level account status on each user:

| Status | Description |
|--------|-------------|
| `ACTIVE` | Default. Full access based on role. |
| `DISABLED` | Signed-in access blocked; historical data preserved. |

**Disable, don't delete:** Admins disable users instead of deleting them. Disabled users remain in the database and stay linked to past orders, businesses, applications, notifications, and audit history. An admin can re-enable the account later.

**Clerk identity is separate:** Disabling a user is app-level only. TownHub does not delete the Clerk user. If Clerk identity removal is ever required, that is a separate manual action in Clerk (or your identity provider).

**Safeguards:**

- Admins must confirm role changes and disable/re-enable actions in the UI.
- An admin cannot disable their own account.
- An admin cannot remove their own `ADMIN` role.
- The last active admin cannot be disabled or demoted to a non-admin role.

**Disabled user access:**

- Blocked from Admin dashboard, Business Hub, business mutations, and authenticated customer orders.
- `GET /api/auth/me` still returns profile (including `status`) so the frontend can show an account-disabled message.
- Guest checkout continues to work without a user account.

---

## Authorization Middleware

| Middleware | Behavior |
|------------|----------|
| `requireAuth` | Valid Clerk session required → 401; disabled users → 403 |
| `requireAdmin` | Session + active `users.role === ADMIN` → 401 / 403 |
| `requireBusinessCatalogAccess` | Auth + business ownership or admin for catalog mutations |

`router.use("/admin", requireAdmin)` in `routes/index.ts` guards almost all `/api/admin/*` paths. Exceptions (intentionally public):

- `GET /api/admin/settings/theme` — brand colors on public pages
- `GET /api/admin/bootstrap-status` — first-run setup probe
- `POST /api/admin/bootstrap` — one-time admin promotion (handler enforces single use)

---

## Guest Order Access Tokens

Guest checkout does **not** require Clerk authentication. Guest orders and pending checkouts have `customerUserId = null`.

To prevent PII leakage, guest order and pending-checkout access use resource-specific **signed HMAC access tokens**:

1. Pay-at-pickup `POST /api/orders` creates an order and returns its `accessToken`.
2. Card `POST /api/checkout/intents` creates `pending_checkouts` state and returns `pendingCheckoutId`, its `accessToken`, and the connected-account Stripe Checkout URL. It does not create an order.
3. `POST /api/checkout/confirm` accepts `pendingCheckoutId` and the pending token, verifies the bound Stripe session, and materializes or returns the paid order idempotently.
4. `GET /api/orders/:id` accepts the resulting order token via `?token=` or `X-Order-Access-Token`.

Tokens are HMAC-SHA256 signed with `SESSION_SECRET` (≥ 32 characters). New tokens use **v2** format:

`v2.{orderId}.{expiresAtUnix}.{signature}`

where `signature = HMAC-SHA256("order:{id}:{expiresAt}")`. Default TTL is **90 days**.

**Legacy v1 tokens** (bare HMAC over `order:{id}` with no expiry) are still accepted so older notification links keep working during rollout.

In production, missing `SESSION_SECRET` throws at startup.

**Who can view an order without a guest token:**

- Platform `ADMIN`
- The business owner for that order's business
- The signed-in customer whose `customerUserId` matches the order

All other callers receive **403**.

Stripe success URLs carry the pending-checkout token to the checkout-return page. After confirmation/materialization, the frontend uses the returned order token for `/order/:id`.

Customer order email and SMS links use `customerOrderUrlForNotification()` — guest orders include `?token=…`; signed-in customer orders omit it because account login grants access.

### Token expiry

v2 tokens embed `expiresAt` in the signed payload. Verification rejects expired tokens. Legacy v1 tokens remain valid until operators choose to drop support.

Optional future hardening:

1. Shorten TTL after most in-flight links have expired.
2. Optionally store revocation nonces for cancelled orders.

## CORS

The API enables `credentials: true` for Clerk iframe and cross-origin preview contexts.

| Environment | Policy |
|-------------|--------|
| Development (`NODE_ENV !== production`) | Reflects any request `Origin` (`origin: true`) for local/preview convenience |
| Production | Allowlist only: `APP_BASE_URL` origin plus comma-separated `CORS_ALLOWED_ORIGINS` |

Unknown browser origins are rejected in production. Requests with no `Origin` header (curl, webhooks, health checks) are allowed.

Configure preview/staging frontends via `CORS_ALLOWED_ORIGINS` — see `.env.example` and [PRODUCTION.md](PRODUCTION.md).

---

### Public (no auth)

| Endpoint | Notes |
|----------|-------|
| `GET /health`, `GET /api/healthz` | Uptime checks |
| `GET /api/businesses`, `GET /api/businesses/:slug` | Active business directory and storefronts |
| `GET /api/businesses/:id/products`, categories, modifier-groups | Public catalog reads |
| `GET /api/events`, `GET /api/highlights` | Community content |
| `GET /api/food-truck-locations/today`, `/upcoming` | Food truck map data |
| `GET /api/weather` | Platform weather widget |
| `GET /api/pricing/plans`, `GET /api/subscription-plans` | Public plan listing |
| `GET /api/admin/settings/theme`, `GET /api/platform/theme` | Brand colors |
| `GET /api/admin/bootstrap-status` | Setup UI probe |
| `POST /api/orders` | Guest and signed-in pay-at-pickup order creation |
| `POST /api/checkout/intents` | Guest and signed-in card intent creation; no durable order yet |
| `POST /api/orders/prep-estimate` | Cart prep-time preview |
| `POST /api/appointment-requests` | Public appointment requests (feature-gated) |
| `POST /api/businesses/apply` | Business application submission |
| `POST /api/checkout/webhook` | Stripe webhook (signature verified, not Clerk) |

### Guest token or auth required

| Endpoint | Rule |
|----------|------|
| `GET /api/orders/:id` | Guest token, admin, owner, or linked customer |
| `POST /api/checkout/confirm` | Pending-checkout token or linked signed-in customer |

### Authenticated (any signed-in user)

| Endpoint | Rule |
|----------|------|
| `GET /api/auth/me`, `/me/businesses`, `/me/business` | Profile |
| `GET /api/me/orders` | Customer order history |
| `PATCH /api/orders/:id/status` | Business owner for that order's business, or admin |
| `POST /api/orders/:id/refund` | Business owner or admin |
| `GET/PATCH /api/businesses/manage/:id` | Owner or admin |
| Business subscription, Stripe Connect, appointment dashboard routes | Owner or admin for the business |

### Owner or admin required

| Endpoint | Rule |
|----------|------|
| `POST/PATCH/DELETE` categories, products, modifier-groups | `requireBusinessCatalogAccess` |
| `POST/PUT/DELETE /api/businesses/:id/food-truck-locations` | Owner or admin for `:id` |
| `GET/POST /api/media`, `POST /api/media/upload` | Auth + `businessId` query for owners; admin may use platform scope |
| `GET /api/businesses/:id/subscription`, feature-access | Owner or admin |

### Admin only

| Endpoint | Rule |
|----------|------|
| `/api/admin/*` (except theme + bootstrap exceptions) | `requireAdmin` |
| `PATCH /api/admin/users/:id/role` | Admin safeguards: self-demotion + last active admin |
| `PATCH /api/admin/users/:id/status` | Admin safeguards: self-disable + last active admin |
| `POST /api/businesses/register` | Direct business creation |
| `POST /api/businesses/manage` | Create business |
| `DELETE /api/businesses/manage/:id` | Archive business |
| `POST/PUT/DELETE /api/events` | Community events |
| `POST/PUT/DELETE /api/highlights` | Homepage banners |

---

## Commerce Guards

Server-side enforcement (not frontend-only):

| Guard | Applies to | Behavior |
|-------|------------|----------|
| `requireOnlineOrderingFeature` | `POST /api/orders`, `POST /api/checkout/intents` | 403 when plan lacks `online_ordering` |
| `requireAppointmentRequestsFeature` | `POST /api/appointment-requests` | 403 when plan lacks `appointment_requests` |
| `isBusinessOpenForPublicCommerce` | Orders and appointments | 400 when business is inactive or archived |

---

## Rate Limiting

Applied to `/api/*` via `createApiRateLimitMiddleware()` in `app.ts`. Stripe webhooks are excluded.

| Tier | Default | Env vars |
|------|---------|----------|
| Write (orders, checkout, applications, media uploads) | 60 / 15 min | `RATE_LIMIT_WRITE_MAX`, `RATE_LIMIT_WRITE_WINDOW_MS` |
| Read (weather, food-truck aggregates) | 120 / 15 min | `RATE_LIMIT_READ_MAX`, `RATE_LIMIT_READ_WINDOW_MS` |

Disable: `RATE_LIMIT_DISABLED=true`. Trust proxy in production: `RATE_LIMIT_TRUST_PROXY` (defaults on when `NODE_ENV=production`).

---

## Media Upload Scoping

Business owners must pass `?businessId=` on `GET /api/media` and `POST /api/media/upload`. The server verifies the caller owns that business. Requests without a valid scope return **403**.

Admins may upload to a specific business or to platform scope (no `businessId`).

---

## Stripe Webhook Security

`POST /api/checkout/webhook` verifies Stripe signatures on the raw request body. Forged or unsigned requests return **400**. A paid order is materialized only after a verified `checkout.session.completed` event or after `/api/checkout/confirm` retrieves the bound Checkout Session from Stripe and confirms it is paid. The browser redirect alone is never payment proof.

---

## Debug Endpoints (Development Only)

| Endpoint | Availability |
|----------|--------------|
| `GET /api/debug/sentry` | Mounted only when `NODE_ENV !== "production"` |
| `/debug/sentry` (frontend) | Route registered only in Vite dev mode |

These intentionally throw test errors for Sentry validation. They are not exposed in production builds.

---

## Security Architecture

```text
Request
  │
  ├─ Public reads (businesses, events, highlights, weather, …)
  │
  ├─ Public writes (orders, appointment-requests, applications)
  │     ├─ Feature gate check (subscription)
  │     └─ Business active/archived check
  │
  ├─ Order view / checkout
  │     ├─ Admin → allow
  │     ├─ Business owner → allow
  │     ├─ Linked customer → allow
  │     └─ Guest → require HMAC access token
  │
  ├─ Catalog mutations (categories, products, modifier-groups)
  │     └─ requireBusinessCatalogAccess (owner or admin)
  │
  ├─ Food truck location mutations
  │     └─ authorizeBusinessOwnerOrAdmin (owner or admin)
  │
  ├─ Media upload/list
  │     └─ Auth + businessId ownership scope
  │
  ├─ Order status / refunds
  │     └─ Auth + business owner or admin
  │
  └─ /api/admin/*
        └─ requireAdmin (with theme/bootstrap exceptions)
```

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Guest order access tokens never expire | Medium | Stateless HMAC; leaked tokens grant permanent access until expiry/revocation is implemented (see Guest Order Access Tokens) |
| No pagination on list endpoints | Medium | Full table scans at scale |
| Cart is client-side only | Low | `localStorage`; no server-side cart persistence |

---

## Related Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design
- [docs/SETUP.md](docs/SETUP.md) — local development
- [PRODUCTION.md](PRODUCTION.md) — deployment checklist
- [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) — Connect payments
- [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) — email/SMS flows
