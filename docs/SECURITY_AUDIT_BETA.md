# TownHub Production Security Verification

Audit of the existing implementation against 10 security categories. **All recommended fixes from the audit have been applied** across two passes.

---

## Fixes Applied

### Pass 1 (initial security pass)

| Issue | Severity | Files | Behavior change |
|-------|----------|-------|-----------------|
| `GET /api/businesses/stats` exposed platform revenue without auth | **High** | `businesses.ts` | Now requires `requireAdmin`. Admin dashboard still works (Clerk JWT). |
| Public business responses leaked `ownerId`, notification emails/phones | **High** | `businesses.ts` | New `serializePublicBusiness()` for list, storefront, checkout. |
| Owners could self-set `featured` / `active` | **Medium** | `businesses.ts` | Only admins can change those fields on PATCH. |
| Order ID enumeration via 404 vs 403 | **Medium** | `orders.ts`, `order-not-found-response.ts` | `GET /orders/:id` and failed checkout auth return uniform 404. |
| Checkout allowed on already-paid orders | **High** | `orders.ts` | Rejects `paymentStatus === "PAID"` before creating Stripe session. |
| Admin bootstrap race | **High** | `auth.ts` | Atomic `UPDATE … WHERE admin count = 0`. |
| Last admin could be demoted | **Medium** | `admin.ts` | Blocks demotion when only one admin remains. |
| Missing rate limits on order lookup / prep-estimate | **Medium** | `rate-limit-paths.ts` | `GET /orders/:id` and `POST /orders/prep-estimate` now limited. |

### Pass 2 (remaining recommendations)

| Issue | Severity | Files | Behavior change |
|-------|----------|-------|-----------------|
| Public catalog exposed unavailable products/modifiers | **Medium** | `products.ts`, `modifier-groups.ts`, `catalog-access.ts` | Public lists default to `available=true` / active-only; owners/admins see full catalog. |
| `GET /admin/highlights` relied on implicit admin guard | **Low** | `highlights.ts` | Explicit `requireAdmin`. |
| Local media files served without auth | **Low** | `media.ts`, `local-media-url.ts` | Signed URLs with expiry for `MEDIA_STORAGE=local`. |
| `POST /businesses/register` manual body cast | **Low** | `businesses.ts` | Uses `CreateBusinessBody` Zod schema. |
| Guest tokens never expire | **Medium** | `order-access-token.ts` | v2 tokens with 90-day TTL; legacy v1 still accepted. |
| `markOrderPaid` race under concurrent webhooks | **Medium** | `stripe-webhook.ts` | Conditional `UPDATE … WHERE paymentStatus != 'PAID'`. |
| Stale checkout session overwrite | **Medium** | `orders.ts`, `stripe.ts` | Reuses open Stripe session when one exists. |
| No Stripe `event.id` dedup | **Low** | `stripe-webhook-dedup.ts`, `operations.ts` | `stripe_webhook_events` table. |
| Raw Stripe auth errors leak env var names | **Low** | `stripe-connect-errors.ts` | Generic client message. |
| Optional bootstrap secret | **High** | `auth.ts`, `.env.example` | `BOOTSTRAP_TOKEN` when set. |
| `assign-owner` without user check | **Low** | `admin.ts` | Verifies `ownerId` exists. |
| Upload MIME not content-validated | **Medium** | `media-image-validate.ts`, `media.ts` | Sharp magic-byte validation. |
| Upload scope from multipart body | **Medium** | `media.ts` | Owners use `?businessId=` only; multer before scope. |
| Reject note length unbounded | **Low** | `applications.ts` | Max 2000 chars on reject note. |
| Loose `paymentMethod` on orders | **Low** | `payment-mode.ts`, `orders.ts` | Rejects unknown methods. |
| Order create not transactional | **Medium** | `orders.ts` | `db.transaction()` for order + items + options. |
| Refund pending race | **Medium** | `order-refunds.ts`, `order-refund.ts` | Partial unique index on pending refunds per order. |
| Double-submit duplicate orders | **Low** | `order-idempotency.ts`, `orders.ts` | `Idempotency-Key` header + table. |
| `/media/optimize` CPU abuse | **Low** | `rate-limit-paths.ts` | Read-tier rate limit. |
| Baseline API rate limit missing | **Low** | `rate-limit-config.ts`, `middlewares/rate-limit.ts` | 300/15 min general limiter. |
| Order lookup limit too loose | **Low** | `rate-limit-paths.ts` | Dedicated 30/15 min limiter for `GET /orders/:id`. |

**Database migration required:** run `pnpm --filter @workspace/db run push` to create `stripe_webhook_events`, `order_idempotency_keys`, and the pending-refund unique index.

---

## 1. Authorization

### Secure (verified)

| Actor | Protection |
|-------|------------|
| **Business owners** | `authorizeBusinessOwnerOrAdmin` on manage routes, catalog mutations, orders list, Stripe Connect, appointments, food trucks (`business-access.ts`) |
| **Customers** | `GET /me/orders` scoped to `customerUserId`; linked-customer access via `authorizeOrderView` |
| **Admins** | Global `requireAdmin` on `/api/admin/*` in `routes/index.ts` (with documented bootstrap/theme exceptions) |
| **Guests** | Order read/checkout require HMAC token or role; no cross-business order access without token |

**Business A → Business B:** Catalog mutations bind `businessId` in URL + SQL. Media scoped via `media-scope.ts`. Order status/refund requires owner of that order's business.

**Customer A → Customer B:** Signed-in customers without a valid token get denied (now 404 on `GET /orders/:id`).

### Remaining findings

None from the original audit. Ongoing hygiene:

| Severity | Note |
|----------|------|
| **Low** | Token in URL query (`?token=`) — prefer `X-Order-Access-Token` header when possible |
| **Info** | Clerk login/signup rate limits are Clerk's responsibility |

**Authorization for beta:** **Production-ready.**

---

## 2. API Security

### Secure (verified)

- Write mutations on catalog, orders (status/refund), businesses (manage), media, admin use Zod or equivalent validation
- Drizzle ORM parameterizes queries — **no raw SQL injection** on audited paths
- `POST /orders` validates products/prices server-side via `validateOrderItemSelections`
- Debug routes gated: `NODE_ENV !== "production"` (`routes/index.ts`)
- Internal jobs require `JOB_SECRET`

### Remaining findings

None from the original audit.

**API security for beta:** **Production-ready.**

---

## 3. Guest Order Security

### Secure (verified)

| Control | Implementation |
|---------|----------------|
| Token algorithm | HMAC-SHA256 v2: `order:{id}:{expiresAt}` (90-day TTL); legacy v1 still accepted |
| Comparison | `crypto.timingSafeEqual` |
| Invalid/missing token | Denied (now uniform 404 on read) |
| Order number bypass | **Not used** for auth — only `orderId` + token |
| Checkout gate | `authorizeOrderAccess` before Stripe session |

### Remaining findings

| Severity | Note |
|----------|------|
| **Low** | Token in URL query (`?token=`) — header preferred when possible |

**Guest orders for beta:** **Production-ready** with strong `SESSION_SECRET` and HTTPS.

---

## 4. Stripe Security

### Production-ready (verified)

| Control | Evidence |
|---------|----------|
| Client prices not trusted | `CreateOrderBody` sends product IDs/qty only; prices from DB |
| Server-side totals | `calculateOrderTotals` on create; checkout line items from persisted order |
| Webhook signatures | Raw body + `constructEvent` (`stripe-webhook-safety.ts`) |
| Amount verification | `evaluateCheckoutSessionPayment` compares Stripe amount to DB total |
| Connect account spoofing | `stripeConnectedAccountId` from DB, validated on webhook |
| Refund auth | `authorizeOrderRefund` — owner/admin only |
| Refund amounts | `validateRefundAmount` caps against server `remainingCents` |
| Mock checkout | Blocked in production |

### Remaining findings

None from the original audit.

**Stripe for beta:** **Production-ready** for core checkout/refund/webhook paths.

---

## 5. Admin Security

### Secure (verified)

- `POST /admin/bootstrap` locked after first admin
- Bootstrap requires Clerk auth
- `/admin/*` guarded except bootstrap + public theme GET
- Role updates use Zod enums
- `assign-owner` requires admin

### Remaining findings

None from the original audit.

**Admin for beta:** **Production-ready.** Set `BOOTSTRAP_TOKEN` on fresh production deploys.

---

## 6. File Upload Security

### Secure (verified)

- 5 MB limit (`mediaUpload.ts`)
- MIME allowlist (jpeg, png, webp, gif)
- `requireMediaAccess` + business scope isolation
- Owners cannot spoof another business's `businessId` (`media-scope.ts`)
- Path traversal blocked (`sanitizeLocalStoredFilename`)
- Optimize endpoint constrained to known media URLs (`media-source.ts`)

### Remaining findings

| Severity | Note |
|----------|------|
| **Low** | `/media/optimize` is rate-limited but still unauthenticated (acceptable with URL allowlist) |

**Uploads for beta:** **Production-ready.**

---

## 7. Input Validation

### Secure (verified)

Most write endpoints use `@workspace/api-zod` schemas. Catalog mutations use `requireBusinessCatalogAccess`. Payment method validated server-side via `validatePaymentMethodForBusiness`.

### Remaining findings

None from the original audit.

**Input validation for beta:** **Production-ready.**

---

## 8. Secrets

### Production-ready (verified)

| Secret | Exposure |
|--------|----------|
| `CLERK_SECRET_KEY` | Server only |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Server only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `SESSION_SECRET` | Server only |
| SMTP / Twilio / Resend | Server only |
| Frontend `VITE_*` | Only publishable Clerk key, proxy URL, Sentry DSN |
| Admin health endpoint | `assertHealthPayloadSafe` strips sensitive patterns |

### Remaining findings

| Severity | Note |
|----------|------|
| **Info** | Dev `SESSION_SECRET` fallback when unset — ensure prod always sets ≥32-char secret |

**Secrets for beta:** **Production-ready** assuming `.env` is not committed and prod env is configured.

---

## 9. Rate Limiting

### Current state

| Tier | Limit | Routes |
|------|-------|--------|
| Write | 60 / 15 min | `POST /orders`, `/checkout/intents`, `/appointment-requests`, `/businesses/apply`, `/media/upload`, etc. |
| Order lookup | 30 / 15 min | `GET /orders/:id` |
| Read | 120 / 15 min | `/weather`, `/media/optimize`, food-truck feeds |
| General | 300 / 15 min | All other `/api/*` |
| Skipped | — | `POST /checkout/webhook` (correct) |

**Rate limiting for beta:** **Production-ready.**

---

## 10. Production Safety

### Secure (verified)

- Webhook signature + amount/account matching
- Order access HMAC with timing-safe compare
- Commerce gates (hours, feature flags, Stripe readiness)
- Refund eligibility + amount caps
- Notification failures logged, not blocking order creation

### Remaining findings

| Severity | Note |
|----------|------|
| **Low** | Failed email/SMS don't roll back orders — acceptable; monitor via admin logs |

**Production safety for beta:** **Production-ready** after transactional order create, webhook dedup, and idempotency.

---

## Summary by Category

| # | Category | Status |
|---|----------|--------|
| 1 | Authorization | **Production-ready** |
| 2 | API Security | **Production-ready** |
| 3 | Guest orders | **Production-ready** |
| 4 | Stripe | **Production-ready** |
| 5 | Admin | **Production-ready** |
| 6 | File uploads | **Production-ready** |
| 7 | Input validation | **Production-ready** |
| 8 | Secrets | **Production-ready** |
| 9 | Rate limiting | **Production-ready** |
| 10 | Production safety | **Production-ready** |

---

## Pre-Beta Checklist

1. Set `SESSION_SECRET` (≥32 chars) in production
2. Run `pnpm --filter @workspace/db run push` for new security tables/indexes
3. Restart API to pick up security fixes
4. Set `BOOTSTRAP_TOKEN` for first-admin setup on fresh installs
5. Monitor admin Operations Center for failed notifications

---

*Generated from production security verification pass. See also `SECURITY.md` for guest token design notes.*
