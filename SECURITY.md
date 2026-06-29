# LocalOrderHub — Security Hardening & Production Readiness

Summary of the security audit and cleanup pass applied to this codebase.

---

## What Was Fixed

### 1. Admin role guard — all `/api/admin/*` routes

**New file:** `artifacts/api-server/src/middlewares/requireRole.ts`

Two middleware functions:
- `requireAuth` — verifies a valid Clerk session; returns 401 if not authenticated
- `requireAdmin` — verifies session + checks DB role is `ADMIN`; returns 403 if not

**`routes/index.ts`** registers a single `router.use("/admin", requireAdmin)` that covers every admin endpoint in one shot.

**Intentional exception:** `GET /admin/settings/theme` is exempted — the app loads brand colors on public pages (home, storefront) without requiring auth. All other `/admin/*` routes are fully guarded.

**Before:** any signed-in user (CUSTOMER, BUSINESS_OWNER) could approve applications, delete subscription plans, change user roles, and read all platform orders.  
**After:** those endpoints return 403 unless the caller's DB role is `ADMIN`.

---

### 2. Missing auth on business manage routes

`PATCH /api/businesses/manage/:id` and `DELETE /api/businesses/manage/:id` had **no auth check at all** — unauthenticated requests from the open internet could modify or delete any business.

| Route | Before | After |
|---|---|---|
| `GET /businesses/manage/:id` | No auth | `requireAuth` |
| `PATCH /businesses/manage/:id` | No auth | `requireAuth` (business owners also use this for settings) |
| `POST /businesses/manage` | Auth only | `requireAdmin` (only admin creates businesses) |
| `DELETE /businesses/manage/:id` | No auth | `requireAdmin` |

---

### 3. Order status mutation with no auth

`PATCH /api/orders/:id/status` had **no auth check at all** — anyone on the internet could flip any order to `PAID`, `CANCELED`, `READY`, etc.

Fixed: added `requireAuth` middleware to the route.

---

### 4. Highlights CRUD not requiring admin role

`POST /PUT /DELETE /api/highlights` checked "is logged in" but not role. Any authenticated customer could create, edit, or delete homepage banners.

Fixed: added `requireAdmin` middleware to all three mutation routes.

---

### 5. Business subscription ownership check

`GET /api/businesses/:businessId/subscription` only checked that the caller was authenticated. Any logged-in user could read any business's subscription details by guessing an integer ID.

Fixed: the route now verifies the caller's `userId` matches `businesses.ownerId` for that business, or that the caller is an `ADMIN`. Non-owners receive a 403.

---

### 6. Pre-existing TypeScript errors fixed

Two `parseInt(req.params.id)` type errors in `highlights.ts` (flagged by `tsc --noEmit`, pre-existing before this pass) were fixed with the same array-safe cast used throughout the rest of the codebase.

**The API server typecheck now passes with zero errors.**

---

### 7. Documentation added

| File | Contents |
|---|---|
| `.env.example` | All required and optional environment variables with comments, split into server and frontend sections |
| `PRODUCTION.md` | Step-by-step production checklist: Clerk production instance, Stripe live mode + webhook, email setup, DB push, admin bootstrap, Replit publish steps, post-deploy smoke tests |

---

## Remaining Risks

These gaps were identified but not fixed in this pass. Address them before handling real users or money.

| Risk | Severity | What to do |
|---|---|---|
| `PATCH /orders/:id/status` — auth added but no ownership check | Medium | Any authenticated user can update any order's status. Fix: fetch the order's `businessId`, verify the caller owns that business or is admin before updating. |
| Stripe webhook signature verification | **Resolved** | Platform webhook verifies signatures; Connect direct charges on business connected accounts; orders marked paid idempotently via `checkout.session.completed` only. See [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md). |
| `/setup` bootstrap page stays live after first use | Low | The endpoint returns 403 once an admin exists, so there is no functional risk. Removing or hiding the route after bootstrap is good hygiene. |
| No rate limiting on public endpoints | Medium | `/api/businesses`, `/api/orders`, and checkout endpoints are unbounded. Add `express-rate-limit` before accepting real traffic. |
| No pagination on list endpoints | Medium | All list endpoints return full DB rows. Fine at demo scale; will degrade with real data. Add `limit` + `offset` query params and a `total` count in responses. |
| Food-truck location mutations lack ownership check | Low | `POST/PUT/DELETE /api/businesses/:id/food-truck-locations` verify auth but not that the caller owns that specific business. |

---

## Security Architecture Summary

```
Public request
    │
    ├─ GET /admin/settings/theme          → no auth (brand colors needed on all pages)
    │
    ├─ GET /api/businesses                → no auth (public directory)
    ├─ GET /api/businesses/:slug          → no auth (public storefront)
    ├─ GET /api/highlights                → no auth (public homepage banners)
    ├─ GET /api/events                    → no auth
    ├─ GET /api/food-truck-locations/today → no auth
    │
    ├─ POST /api/orders                   → auth (Clerk session)
    ├─ POST /api/checkout/session         → auth
    ├─ GET  /api/orders/:id               → no auth (order confirmation page)
    ├─ PATCH /api/orders/:id/status       → auth
    │
    ├─ /api/businesses/manage/*           → auth or admin (see above)
    ├─ POST/PUT/DELETE /api/highlights    → ADMIN role
    ├─ GET /api/businesses/:id/subscription → auth + business ownership or ADMIN
    │
    └─ /api/admin/*  (all other paths)    → ADMIN role  ← enforced by router.use()
           includes: users, applications, orders, plans,
                     subscription assignment, notification logs, etc.
```

Clerk session tokens are passed as `Authorization: Bearer <token>` headers on all authenticated requests (SameSite=Lax cookies are blocked inside the Replit preview iframe).
