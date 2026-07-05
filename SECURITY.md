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

First-run admin promotion: `POST /api/admin/bootstrap` (works only while zero admins exist). Ongoing role changes: Admin → Users.

---

## Authorization Middleware

| Middleware | Behavior |
|------------|----------|
| `requireAuth` | Valid Clerk session required → 401 |
| `requireAdmin` | Session + `users.role === ADMIN` → 401 / 403 |
| `requireBusinessCatalogAccess` | Auth + business ownership or admin for catalog mutations |

`router.use("/admin", requireAdmin)` in `routes/index.ts` guards almost all `/api/admin/*` paths. Exceptions (intentionally public):

- `GET /api/admin/settings/theme` — brand colors on public pages
- `GET /api/admin/bootstrap-status` — first-run setup probe
- `POST /api/admin/bootstrap` — one-time admin promotion (handler enforces single use)

---

## Guest Order Access Tokens

Guest checkout does **not** require Clerk authentication to place an order. Guest orders have `customerUserId = null`.

To prevent PII leakage, guest order viewing and Stripe checkout require a **signed HMAC access token**:

1. `POST /api/orders` returns `accessToken` in the response body (guest and signed-in orders).
2. `GET /api/orders/:id` accepts the token via `?token=` query param or `X-Order-Access-Token` header.
3. `POST /api/checkout/session` accepts `accessToken` in the JSON body for guest Stripe checkout.

Tokens are HMAC-SHA256 over `order:{id}`, signed with `SESSION_SECRET` (≥ 32 characters). In production, missing `SESSION_SECRET` throws at startup.

**Who can view an order without a guest token:**

- Platform `ADMIN`
- The business owner for that order's business
- The signed-in customer whose `customerUserId` matches the order

All other callers receive **403**.

Stripe success URLs include `?token=…` so the confirmation page can load the order.

---

## Endpoint Authorization Summary

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
| `POST /api/orders` | Guest and signed-in checkout |
| `POST /api/orders/prep-estimate` | Cart prep-time preview |
| `POST /api/appointment-requests` | Public appointment requests (feature-gated) |
| `POST /api/businesses/apply` | Business application submission |
| `POST /api/checkout/webhook` | Stripe webhook (signature verified, not Clerk) |

### Guest token or auth required

| Endpoint | Rule |
|----------|------|
| `GET /api/orders/:id` | Guest token, admin, owner, or linked customer |
| `POST /api/checkout/session` | Same access rules as order view |

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
| `GET/POST /api/media`, `POST /api/media/upload` | Auth + `businessId` query for owners; admin may use platform scope |
| `GET /api/businesses/:id/subscription`, feature-access | Owner or admin |

### Admin only

| Endpoint | Rule |
|----------|------|
| `/api/admin/*` (except theme + bootstrap exceptions) | `requireAdmin` |
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
| `requireOnlineOrderingFeature` | `POST /api/orders` | 403 when plan lacks `online_ordering` |
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

`POST /api/checkout/webhook` verifies Stripe signatures on the raw request body. Forged or unsigned requests return **400**. Order payment status is updated only from verified `checkout.session.completed` events — not from browser redirects.

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
| Food-truck location mutations lack per-business ownership check | Low | `POST/PUT/DELETE /businesses/:id/food-truck-locations` verify auth but not that the caller owns that business |
| Guest notification links omit access token | Medium | Email/SMS templates use `/order/{id}` without `?token=` — guests clicking notification links may get 403 until templates are updated |
| No pagination on list endpoints | Medium | Full table scans at scale |
| Cart is client-side only | Low | `localStorage`; no server-side cart persistence |

---

## Related Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design
- [docs/SETUP.md](docs/SETUP.md) — local development
- [PRODUCTION.md](PRODUCTION.md) — deployment checklist
- [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) — Connect payments
- [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) — email/SMS flows
