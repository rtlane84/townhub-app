# TownHub Architecture

System design reference for developers and AI assistants. For setup instructions see [SETUP.md](SETUP.md). For security rules see [../SECURITY.md](../SECURITY.md).

---

## Overview

TownHub is a contract-first monorepo:

```text
┌─────────────────────────────────────────────────────────────┐
│  React frontend (townhub)  :23032                   │
│  wouter routing · TanStack Query · Clerk · cart (localStorage)│
└──────────────────────────┬──────────────────────────────────┘
                           │ /api (Bearer JWT + guest tokens)
┌──────────────────────────▼──────────────────────────────────┐
│  Express API (api-server)  :8080                              │
│  Clerk middleware · rate limits · route handlers              │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
   PostgreSQL    Supabase Storage   Stripe / Resend / Twilio / Sentry
   (Drizzle)      (media uploads)
```

**Source of truth:** `lib/api-spec/openapi.yaml` → Orval generates React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`).

Guest order `?token=` is documented in the OpenAPI operation description (not as a query parameter) because adding it to the spec causes Orval type collisions; the server reads `req.query.token` directly.

---

## Frontend (`artifacts/townhub`)

| Concern | Implementation |
|---------|----------------|
| Routing | wouter with `BASE_PATH` support |
| Data fetching | TanStack Query v5 via generated hooks |
| Auth UI | `@clerk/react` `ClerkProvider` with optional `proxyUrl` |
| API auth | `ClerkApiTokenBridge` → `Authorization: Bearer` on all requests |
| Cart | `cart-context.tsx` — per-business, `localStorage`-backed |
| Theming | `PlatformThemeProvider` loads admin theme colors |
| Multi-business | `SelectedBusinessProvider` + `BusinessFeatureAccessProvider` |
| Errors | Sentry `ErrorBoundary` + context bridge |

### Key public routes

| Path | Purpose |
|------|---------|
| `/` | Homepage (highlights, featured businesses, events) |
| `/businesses`, `/businesses/:slug` | Directory and storefront |
| `/cart`, `/order/:id` | Checkout and confirmation |
| `/events`, `/food-trucks`, `/pricing`, `/help` | Community and marketing |
| `/my-orders` | Signed-in customer order history |

### Business dashboard

Overview, orders, kitchen display, products, product options (modifier groups), categories, locations (food trucks), appointments, billing, subscription, settings.

### Business Hub live updates (SSE)

While an owner or admin has Business Hub open on **Overview**, **Orders**, **Kitchen**, or **Appointments**, the frontend opens a single Server-Sent Events stream per selected business:

```text
GET /api/businesses/:businessId/live-events
  → requireAuth + authorizeBusinessOwnerOrAdmin
  → text/event-stream with heartbeat every ~25s
  → minimal JSON payload (ids + status only, no PII)
```

**Push notifications remain the urgency channel** (browser toast/sound, email, SMS, ntfy, Discord). SSE only refreshes dashboard React Query caches so lists feel near real-time without constant polling.

**Event bus (beta):** `business-live-events.ts` is an in-process pub/sub map keyed by `businessId`. Order and appointment routes publish after successful mutations; the Stripe webhook publishes `order.paid` / refund events. This is correct for a **single API instance**. Multi-instance production requires a shared bus (Redis pub/sub, Postgres `LISTEN/NOTIFY`, or another message broker) so every instance can fan out to its local SSE connections.

**Frontend fallback:** If SSE is unavailable, returns 401/403, or fails after repeated reconnect attempts, live pages use HTTP polling (~12s). Non-live Business Hub pages always poll. See [BUSINESS_HUB_LIVE_NOTIFICATIONS.md](BUSINESS_HUB_LIVE_NOTIFICATIONS.md) for toast, banner, and tab/visibility behavior. A small status dot shows Live / Reconnecting / Polling / Offline on live pages.

**Security:** Customers and guests cannot subscribe. Events are scoped to one business; payloads exclude customer PII, Stripe IDs, tokens, and notes.

### Admin dashboard

Overview, businesses, applications, orders, users, events, highlights, plans, features, settings, system status (health + notification logs).

---

## Backend (`artifacts/api-server`)

Express 5 app in `src/app.ts`:

1. Pino HTTP logging
2. `GET /health` (public uptime)
3. Clerk FAPI proxy at `/api/__clerk`
4. CORS, JSON body parser
5. Raw body for Stripe webhook route only
6. `clerkMiddleware()` globally
7. Rate limiting on `/api/*`
8. Route modules from `src/routes/index.ts`

Build: esbuild CJS bundle. Sentry instrument loaded before app via `--import ./dist/instrument.mjs`.

### Route modules

| Module | Domain |
|--------|--------|
| `auth.ts` | Profile, bootstrap |
| `businesses.ts` | Public directory, manage CRUD, register |
| `products.ts`, `modifier-groups.ts` | Catalog (mutations guarded) |
| `orders.ts` | Orders, checkout, webhooks, refunds |
| `business-live-events.ts` | Owner/admin SSE stream for dashboard live updates |
| `appointment-requests.ts` | Salon/service appointments |
| `subscriptions.ts` | Plans, billing, feature access |
| `applications.ts` | Business applications |
| `events.ts`, `highlights.ts` | Community content |
| `food-truck.ts` | Location tracking |
| `media.ts` | Supabase/local uploads |
| `stripe-connect.ts` | Per-business Connect onboarding |
| `weather.ts` | Platform weather widget |
| `platform.ts` | Theme, notification logs |
| `admin.ts` | Users, system health |
| `internal-jobs.ts` | Cron-triggered jobs (`JOB_SECRET`) |
| `dev.ts` | Dev-only Clerk relink (404 in production) |
| `debug.ts` | Dev-only Sentry test (not mounted in production) |

---

## Database (`lib/db`)

PostgreSQL via Drizzle ORM. Schema push workflow (`pnpm --filter @workspace/db run push`).

### Core tables

| Table | Purpose |
|-------|---------|
| `users` | Clerk-synced users with role |
| `businesses` | Profiles, hours, payment modes, Stripe Connect IDs |
| `categories`, `products` | Catalog per business |
| `modifier_groups`, `product_options` | Product customization |
| `orders` | Orders with JSONB line items, tax, prep estimates |
| `order_refunds` | Refund audit trail |
| `appointment_requests` | Request-based booking |
| `subscription_plans`, `subscription_features`, `plan_features` | Feature catalog |
| `business_subscriptions` | Per-business plan assignment |
| `business_applications` | Onboarding applications |
| `events`, `highlights` | Community content |
| `food_truck_locations` | Daily locations |
| `media_assets` | Upload metadata |
| `notification_logs` | Delivery audit |
| `platform_settings` | Theme and global config |

**Prices:** stored as `numeric(10,2)`, returned as dollar floats. Do not divide by 100 in the frontend.

---

## Authentication

Clerk manages identity. On first API call, `ensureDbUser` creates a `users` row with role `CUSTOMER`.

**Clerk proxy:** FAPI calls route through `/api/__clerk` for custom-domain deployments. In Replit preview, `VITE_CLERK_PROXY_URL` is empty so Clerk loads from CDN.

**Bearer tokens:** Required for authenticated API calls in iframe/cross-site contexts. `setAuthTokenGetter` in `custom-fetch.ts` attaches the JWT.

**Bootstrap:** `POST /api/admin/bootstrap` promotes the first user to `ADMIN` when no admin exists.

---

## Authorization

See [SECURITY.md](../SECURITY.md) for the full matrix. Summary:

- **Admin:** `requireAdmin` on `/api/admin/*`
- **Catalog mutations:** `requireBusinessCatalogAccess` (owner or admin)
- **Order view/checkout:** `authorizeOrderAccess` (guest token, owner, admin, or linked customer)
- **Order status/refunds:** `authorizeOrderStatusUpdate` (owner or admin)
- **Media:** `resolveOwnerMediaBusinessId` scopes uploads to owned businesses
- **Subscriptions:** ownership check on business subscription endpoints

---

## Guest Order Access Tokens

```text
POST /api/orders
  → creates order
  → returns { id, accessToken, ... }

GET /api/orders/:id?token={accessToken}
  → authorizeOrderAccess verifies HMAC

POST /api/checkout/session { orderId, accessToken }
  → same authorization before Stripe session creation
```

Implementation:

- `lib/order-access-token.ts` — HMAC create/verify using `SESSION_SECRET`
- `lib/order-request-access.ts` — extracts token from query/header/body
- `lib/order-customer-access.ts` — role-based view rules

Frontend: `src/lib/order-access.ts` builds `/order/:id?token=…` paths. Stripe success URL includes the token.

---

## Stripe Connect (Customer Payments)

Each business has its own Stripe Express connected account. Card payments are **direct charges** on that account.

```text
Customer → POST /orders (paymentMethod: STRIPE)
        → POST /checkout/session
        → Stripe Checkout on connected account
        → checkout.session.completed webhook
        → order paymentStatus = PAID
```

- Platform `STRIPE_SECRET_KEY` enables Connect API calls
- Business completes onboarding via Dashboard → Settings → Payments
- Pay-at-pickup (`IN_PERSON`) bypasses Stripe entirely
- Mock mode when no platform key (dev only; blocked in production)

Guide: [STRIPE_SETUP.md](STRIPE_SETUP.md).

---

## Stripe Billing (Platform Subscriptions)

Businesses pay TownHub for subscription plans. Uses the same platform Stripe account (not connected accounts).

```text
Admin assigns plan OR business checks out via /subscription/checkout
  → Stripe subscription created
  → webhooks update business_subscriptions
  → feature gates read plan_features mapping
```

Webhook events: `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed` (routed alongside Connect order events at `POST /api/checkout/webhook`).

Customer Portal: `POST /businesses/:id/subscription/portal`.

Guide: [STRIPE_BILLING_SETUP.md](STRIPE_BILLING_SETUP.md). Owner emails: [SUBSCRIPTION_NOTIFICATIONS.md](SUBSCRIPTION_NOTIFICATIONS.md).

---

## Stripe Refunds

`POST /api/orders/:id/refund` — business owner or admin issues full or partial refunds on paid Stripe orders. Creates `order_refunds` records and calls Stripe Refund API on the connected account.

---

## Taxes

Per-product `taxable` flag on catalog items. Order creation calculates subtotal, tax (when configured for the business/jurisdiction), delivery fee, and total. Tax appears in order confirmation, notifications, and dashboard views.

---

## Prep-Time Estimates

`POST /api/orders/prep-estimate` previews ASAP preparation window for a cart before checkout. Used by the storefront to show estimated ready time.

---

## Supabase Storage

Default media backend. API uploads server-side with the service role key; the browser never talks to Supabase directly.

Paths: `business-{id}/{uuid}.ext` for owners, `platform/{uuid}.ext` for admin.

`MEDIA_STORAGE=local` writes to `./uploads` and serves via `/api/media/files/…` (dev only).

Owners pass `?businessId=` on list/upload. See [SECURITY.md](../SECURITY.md).

---

## Notifications

Fire-and-forget delivery via `notification-service.ts`. All attempts logged to `notification_logs` (viewable in Admin → System Status).

| Channel | Provider | Config |
|---------|----------|--------|
| Email | Resend (preferred) or SMTP | `RESEND_API_KEY` + `RESEND_FROM` |
| SMS | Twilio | `TWILIO_*` |

Triggers: order lifecycle, new orders (owner), appointment requests (owner), application approval/rejection, subscription lifecycle.

Guide: [NOTIFICATIONS.md](NOTIFICATIONS.md).

**Known gap:** guest notification links use `/order/{id}` without `?token=` — guests may need the token from the confirmation email flow.

---

## Sentry

- API: `@sentry/node` via `instrument.ts` (loaded before app)
- Frontend: `@sentry/react` via `main.tsx`
- Dev-only test routes: `GET /api/debug/sentry`, `/debug/sentry` page

Guide: [SENTRY_SETUP.md](SENTRY_SETUP.md).

---

## Business Ownership Model

- `businesses.owner_id` → Clerk user ID
- A user may own **multiple** businesses (`GET /api/auth/me/businesses`)
- Dashboard uses `SelectedBusinessProvider` to switch context
- Catalog, media, orders, and settings are scoped to the selected business

Admins bypass ownership checks where explicitly coded (catalog on any business, all admin routes).

---

## Feature Gates

Subscription plans map to features via `plan_features` → `subscription_features`.

| Feature key | Gates |
|-------------|-------|
| `online_ordering` | `POST /api/orders` |
| `appointment_requests` | `POST /api/appointment-requests` |

`GET /api/businesses/:id/feature-access` returns the owner-facing report. Frontend `BusinessFeatureAccessProvider` reads this for UI gating; API enforces independently.

Businesses without a subscription record receive all active features (backward compatibility). Complimentary/beta plans and inactive subscription statuses may restrict features.

---

## Order Lifecycle

```text
NEW → CONFIRMED → PREPARING → READY_FOR_PICKUP / OUT_FOR_DELIVERY → COMPLETED
                                                              ↘ CANCELED
```

| Status change | Customer notification event |
|---------------|---------------------------|
| Order placed (pay-at-pickup) | ORDER_RECEIVED |
| Webhook marks PAID (card) | ORDER_RECEIVED |
| CONFIRMED | ORDER_ACCEPTED |
| PREPARING | ORDER_PREPARING |
| READY_FOR_PICKUP | ORDER_READY_FOR_PICKUP |
| OUT_FOR_DELIVERY | ORDER_OUT_FOR_DELIVERY |
| COMPLETED | ORDER_COMPLETED |
| CANCELED | ORDER_CANCELLED |

Owner receives NEW_ORDER alert on creation.

---

## Appointment Lifecycle

Request-based (not instant booking):

```text
NEW → CONFIRMED / DECLINED → COMPLETED / CANCELED
```

Public `POST /api/appointment-requests` creates customer requests. Owners manage via dashboard. Manual entry supported for phone/walk-in appointments.

---

## Admin System

`GET /api/admin/system/health` returns service health (database, storage, email, SMS, Stripe, auth, weather). Admin → System Status page displays this plus notification logs.

Internal jobs (`POST /api/internal/jobs/subscription-trial-reminders`) require `Authorization: Bearer $JOB_SECRET`.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Contract-first API | Single OpenAPI spec drives client hooks and server Zod validation |
| Clerk proxy pattern | Custom domains without CORS issues |
| Prices as dollar floats | `numeric(10,2)` in DB, `parseFloat` in API — no cents conversion in UI |
| Cart per-business | Switching businesses prompts to clear cart |
| Guest access tokens | Stateless HMAC — no session table for guest PII access |
| Push-based schema | Fast iteration in dev; review diffs before production push |
| Route ordering | `/businesses/stats` and `/businesses/manage/:id` registered before `/businesses/:slug` |

### Gotchas

- **Orval TS2308:** Operations with both path and query params can collide — filter via `req.query` in handlers when needed.
- **CSS @import order:** Load Google Fonts via `<link>` in `index.html`, not `@import` in CSS.
- **Clerk proxy URL:** Must come from `VITE_CLERK_PROXY_URL` env var, never hardcoded.

---

## Related Documentation

- [SETUP.md](SETUP.md) — local development
- [../SECURITY.md](../SECURITY.md) — authorization matrix
- [../PRODUCTION.md](../PRODUCTION.md) — deployment
- [../lib/api-spec/openapi.yaml](../lib/api-spec/openapi.yaml) — full API contract
