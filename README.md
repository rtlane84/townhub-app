# LocalOrderHub — Complete Handoff Summary

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24, TypeScript 5.9 |
| Monorepo | pnpm workspaces |
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui |
| Routing (FE) | wouter |
| Data fetching | TanStack Query v5 |
| Auth | Clerk (managed Replit instance) |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4, drizzle-zod, Orval-generated schemas |
| Payments | Stripe SDK (mock fallback when key absent) |
| API contract | OpenAPI 3.0 → Orval codegen |
| Build | esbuild (server, CJS bundle) |

---

## Folder Structure

```
/
├── artifacts/
│   ├── api-server/                  # Express API (port via $PORT, default 8080)
│   │   └── src/
│   │       ├── app.ts               # Express setup, Clerk middleware, proxy
│   │       ├── index.ts             # Entry point
│   │       ├── lib/
│   │       │   ├── stripe.ts        # Stripe client with mock fallback
│   │       │   ├── logger.ts        # Pino logger singleton
│   │       │   └── notifications.ts # Email via Resend/SMTP (optional)
│   │       ├── middlewares/
│   │       │   └── clerkProxyMiddleware.ts  # Proxies /api/__clerk → Clerk FAPI
│   │       └── routes/              # One file per resource domain
│   │           ├── index.ts         # Mounts all routers
│   │           ├── auth.ts          # /api/auth/me, /api/auth/me/business, bootstrap
│   │           ├── businesses.ts    # Public + owner business CRUD
│   │           ├── products.ts      # Categories + products CRUD
│   │           ├── orders.ts        # Order creation, status, Stripe checkout
│   │           ├── admin.ts         # User management, role assignment
│   │           ├── subscriptions.ts # Plans CRUD, business subscription assignment
│   │           ├── applications.ts  # Business applications + approval flow
│   │           ├── highlights.ts    # Homepage highlight banners
│   │           ├── events.ts        # Community events
│   │           ├── food-truck.ts    # Food truck location tracking
│   │           ├── platform.ts      # Theme settings, notification logs
│   │           └── health.ts        # GET /api/healthz
│   │
│   ├── local-order-hub/             # React frontend (port via $PORT)
│   │   └── src/
│   │       ├── App.tsx              # Router, Clerk provider, route table
│   │       ├── pages/
│   │       │   ├── home.tsx
│   │       │   ├── businesses.tsx   # Public business directory
│   │       │   ├── storefront.tsx   # Business storefront + add to cart
│   │       │   ├── cart.tsx         # Cart + checkout trigger
│   │       │   ├── order-confirmation.tsx
│   │       │   ├── list-your-business.tsx  # 3-step application flow
│   │       │   ├── setup.tsx        # First-run admin bootstrap
│   │       │   ├── dashboard/
│   │       │   │   ├── business/    # Business owner dashboard
│   │       │   │   │   ├── overview.tsx
│   │       │   │   │   ├── orders.tsx / order-detail.tsx
│   │       │   │   │   ├── products.tsx / categories.tsx
│   │       │   │   │   ├── locations.tsx  # Food truck locations
│   │       │   │   │   ├── billing.tsx
│   │       │   │   │   └── settings.tsx
│   │       │   │   └── admin/       # Platform admin dashboard
│   │       │   │       ├── overview.tsx
│   │       │   │       ├── businesses.tsx
│   │       │   │       ├── applications.tsx
│   │       │   │       ├── orders.tsx
│   │       │   │       ├── users.tsx
│   │       │   │       ├── plans.tsx
│   │       │   │       ├── events.tsx
│   │       │   │       ├── highlights.tsx
│   │       │   │       └── settings.tsx
│   │       └── components/
│   │           ├── cart-context.tsx   # localStorage-backed cart state
│   │           ├── dashboard-layout.tsx
│   │           └── ui/               # shadcn/ui components
│   │
│   └── mockup-sandbox/              # Canvas/design preview server (internal)
│
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml             # ← Source of truth for all API contracts
│   ├── api-client-react/
│   │   └── src/generated/           # Orval-generated TanStack Query hooks
│   ├── api-zod/
│   │   └── src/generated/           # Orval-generated Zod schemas
│   └── db/
│       ├── drizzle.config.ts
│       └── src/
│           ├── index.ts             # DB pool export
│           └── schema/              # Drizzle table definitions
│               ├── users.ts
│               ├── businesses.ts
│               ├── products.ts
│               ├── orders.ts
│               ├── events.ts
│               ├── highlights.ts
│               ├── subscriptions.ts
│               ├── notifications.ts
│               ├── platform.ts
│               └── applications.ts
│
├── pnpm-workspace.yaml              # Workspace config + catalog pins
├── tsconfig.base.json               # Shared strict TS config
└── tsconfig.json                    # Solution file for composite libs
```

---

## How to Run Locally

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables (see next section)
cp .env.example .env   # create this manually; no example file exists yet

# 3. Push the DB schema (first time or after schema changes)
pnpm --filter @workspace/db run push

# 4. Start the API server (in one terminal)
pnpm --filter @workspace/api-server run dev

# 5. Start the frontend (in another terminal)
pnpm --filter @workspace/local-order-hub run dev

# Other useful commands
pnpm run typecheck                              # Full typecheck across all packages
pnpm run build                                  # Typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen  # Regenerate hooks + Zod schemas
```

---

## Environment Variables

### Server (`artifacts/api-server/`)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | ✅ Yes | From Clerk dashboard → API Keys |
| `CLERK_PUBLISHABLE_KEY` | ✅ Yes | Same source |
| `SESSION_SECRET` | ✅ Yes | Any random string ≥ 32 chars |
| `STRIPE_SECRET_KEY` | Optional | Live/test secret key — see [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) |
| `STRIPE_WEBHOOK_SECRET` | With Stripe | Webhook signing secret — see [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) |
| `RESEND_API_KEY` | Optional | Email notifications — see [docs/RESEND_SETUP.md](docs/RESEND_SETUP.md) |
| `SMTP_HOST` / `SMTP_PORT` | Optional | Alternative email transport |
| `SUPABASE_URL` | ✅ Yes (media) | Supabase project URL for image storage |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes (media) | Server-side only — uploads via API |
| `SUPABASE_STORAGE_BUCKET` | ✅ Yes (media) | Public Supabase Storage bucket name |
| `MEDIA_STORAGE` | Optional | Set to `local` for dev-only filesystem fallback (default: Supabase) |
| `PORT` | Auto | Set by Replit/workflow; defaults to 8080 |
| `NODE_ENV` | Auto | `development` or `production` |

**Production provider setup guides:** [Stripe](docs/STRIPE_SETUP.md) · [Resend](docs/RESEND_SETUP.md) · [Twilio](docs/TWILIO_SETUP.md) · [Production checklist](PRODUCTION.md)

### Frontend (`artifacts/local-order-hub/`)

| Variable | Required | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ Yes | Same key as server-side |
| `VITE_CLERK_PROXY_URL` | Optional | Set to `/api/__clerk` for custom domain; auto-set in Replit |
| `BASE_PATH` | Auto | Set by Replit workflow; controls the app's base URL path |
| `PORT` | Auto | Set by Replit/workflow |

---

## Database Setup & Migrations

Drizzle ORM is used — **no traditional migration files**. Schema changes are pushed directly.

```bash
# Apply current schema to DB (safe for dev; destructive changes require --force)
pnpm --filter @workspace/db run push

# Inspect current DB state via Drizzle Studio
pnpm --filter @workspace/db run studio
```

### Tables

| Table | Purpose |
|---|---|
| `users` | Synced from Clerk; stores role (CUSTOMER / BUSINESS_OWNER / ADMIN) |
| `businesses` | Business profiles, settings, active/featured flags |
| `products` | Products belonging to a business |
| `categories` | Product categories scoped to a business |
| `orders` | Customer orders with line items (JSONB) |
| `subscription_plans` | Plans (name, monthlyPrice, trialDays, setupFee, features) |
| `business_subscriptions` | Links a business to a plan + status (ACTIVE/TRIALING/etc.) |
| `business_applications` | Application records for the "List Your Business" flow |
| `events` | Community events |
| `highlights` | Homepage highlight banners |
| `food_truck_locations` | Daily location entries per business |
| `media_assets` | Uploaded image metadata (Supabase Storage paths + public URLs) |
| `platform_settings` | Key/value store for theme color and global config |
| `notification_logs` | Log of sent email/SMS notifications |

> **Price precision:** All prices stored as `numeric(10,2)` and returned as dollar floats. Never divide by 100 in the frontend.

### Supabase Storage (media uploads)

Image uploads use **Supabase Storage** by default. The API uploads server-side with the service role key; the frontend never talks to Supabase directly.

1. In Supabase → **Storage**, create a bucket (e.g. `media`) and mark it **Public** so product/storefront images load without signed URLs.
2. Add to `.env`:
   - `SUPABASE_URL` — project URL (`https://xxxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` — **server only** (Settings → API)
   - `SUPABASE_STORAGE_BUCKET` — bucket name (e.g. `media`)
3. Restart the API server after changing env vars.

Uploaded files are stored at paths like `platform/{uuid}.jpg` (admin) or `business-{id}/{uuid}.jpg` (owners). The `media_assets` table stores the storage path and public URL. External image URLs pasted in forms continue to work unchanged.

**Local dev without Supabase:** set `MEDIA_STORAGE=local` to write files to `./uploads` and serve them at `/api/media/files/…`. This is for offline dev only — production should always use Supabase.

---

## Auth Setup with Clerk

### Architecture

All Clerk Frontend API (FAPI) calls are proxied through the Express server at `/api/__clerk`. This enables the app to work on custom domains without CORS issues.

- **Server:** `@clerk/express` — `clerkMiddleware()` applied globally; `getAuth(req)` used in route handlers to extract `userId`
- **Frontend:** `@clerk/react` — `ClerkProvider` is configured with `proxyUrl` pointing to `/api/__clerk`
- **Auth pattern in API calls:** Because the Replit preview runs inside an iframe (blocking `SameSite=Lax` cookies), all authenticated fetch calls pass the Clerk session token as a **Bearer token** in the `Authorization` header. A `ClerkApiTokenBridge` component on the frontend writes `window.__clerkToken` after each auth state change; all generated hooks and raw fetches pick this up.

### First-Run Bootstrap

1. Sign up with any email at `/sign-up`
2. Navigate to `/setup`
3. Click **Bootstrap Admin** — this promotes the first signed-in user to the `ADMIN` role
4. Only works once (no-op if an admin already exists)

**Changed Clerk keys locally?** If your session user ID no longer matches the DB, see [docs/DEV_CLERK_RELINK.md](docs/DEV_CLERK_RELINK.md) for a dev-only relink script.

### Role Assignment

Admins can promote/demote users at **Admin → Users** (`/dashboard/admin/users`). Roles: `CUSTOMER`, `BUSINESS_OWNER`, `ADMIN`.

---

## Stripe / Mock Payment Notes

TownHub uses **Stripe Connect** — each business connects its own Stripe account; card payments are direct charges on that account. See [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md).

- The Stripe client in `artifacts/api-server/src/lib/stripe.ts` checks for `STRIPE_SECRET_KEY` at startup.
- **If the key is absent (dev only):** mock checkout redirects without charging; orders stay `PENDING`.
- **If the key is present:** Checkout sessions are created on the business's connected account. The webhook at `POST /api/checkout/webhook` verifies signatures and handles `checkout.session.completed` to mark orders paid.
- **Pay at Pickup:** Bypasses Stripe entirely (`paymentMethod: IN_PERSON`).
- Online card checkout requires the business to complete Connect onboarding (**Settings → Payments**).

---

## User Roles & Test Flow

### Customer

1. Browse `/businesses` → click a business → view its storefront
2. Add products to cart (cart is per-business — switching businesses prompts to clear)
3. Go to `/cart` → choose Stripe or Pay at Pickup → checkout
4. Receive order confirmation at `/order/:id`

### Business Owner

Requires role `BUSINESS_OWNER` and an owned business.

1. Navigate to `/list-your-business` — 3-step form: business info → plan selection → submit
2. Admin approves the application → business is created and user is set as owner
3. Access `/dashboard/business` for:
   - **Overview** — today's orders + revenue
   - **Orders** — list and update order status
   - **Products** — CRUD products with pricing and images
   - **Categories** — CRUD categories
   - **Locations** — food truck daily location entries
   - **Billing** — current plan, subscription status, available plans
   - **Settings** — business profile, hours, pickup toggle

### Platform Admin

Requires role `ADMIN`.

Access `/dashboard/admin` for:

- **Overview** — platform-wide stats
- **Businesses** — CRUD all businesses; assign owner; change subscription plan
- **Applications** — review, approve, or reject business applications
- **Orders** — all orders across all businesses
- **Users** — list all users, change roles
- **Plans** — CRUD subscription plans (name, price, trial days, features); $0 = Free plan
- **Events** — community events management
- **Highlights** — homepage banner management (Live / Scheduled / Expired badges)
- **Settings** — platform theme color

---

## Main Routes

### Public Frontend Routes

| Path | Page |
|---|---|
| `/` | Home (highlights, featured businesses, events) |
| `/businesses` | Business directory |
| `/businesses/:slug` | Business storefront |
| `/cart` | Cart + checkout |
| `/order/:id` | Order confirmation |
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/setup` | First-run admin bootstrap |
| `/list-your-business` | 3-step business application form |

### Business Dashboard Routes (auth required, role: BUSINESS_OWNER)

| Path | Page |
|---|---|
| `/dashboard/business` | Overview / today's stats |
| `/dashboard/business/orders` | Order list |
| `/dashboard/business/orders/:id` | Order detail |
| `/dashboard/business/products` | Product management |
| `/dashboard/business/categories` | Category management |
| `/dashboard/business/locations` | Food truck locations |
| `/dashboard/business/billing` | Subscription + plan info |
| `/dashboard/business/settings` | Business settings |

### Admin Dashboard Routes (auth required, role: ADMIN)

| Path | Page |
|---|---|
| `/dashboard/admin` | Platform overview |
| `/dashboard/admin/businesses` | Business management |
| `/dashboard/admin/applications` | Application review |
| `/dashboard/admin/orders` | All orders |
| `/dashboard/admin/users` | User + role management |
| `/dashboard/admin/plans` | Subscription plan management |
| `/dashboard/admin/events` | Events management |
| `/dashboard/admin/highlights` | Highlight banner management |
| `/dashboard/admin/settings` | Theme settings |

---

## API Routes

### Auth
- `GET /api/auth/me` — current user profile + role
- `GET /api/auth/me/business` — current user's business (if owner)
- `POST /api/admin/bootstrap` — promote first user to admin

### Businesses
- `GET /api/businesses` — public list (active only)
- `GET /api/businesses/stats` — platform-wide stats (admin)
- `GET /api/businesses/:slug` — public storefront data
- `POST /api/businesses/register` — create business directly (admin)
- `POST /api/businesses/manage` — create via manage flow
- `GET /api/businesses/manage/:id` — owner/admin fetch
- `PATCH /api/businesses/manage/:id` — update
- `DELETE /api/businesses/manage/:id` — delete

### Products & Categories
- `GET/POST /api/businesses/:id/categories`
- `PATCH/DELETE /api/businesses/:id/categories/:catId`
- `GET/POST /api/businesses/:id/products`
- `PATCH/DELETE /api/businesses/:id/products/:productId`

### Orders & Checkout
- `POST /api/orders` — create order (pay-at-pickup)
- `GET /api/orders/:id` — order detail
- `PATCH /api/orders/:id/status` — update order status
- `GET /api/businesses/:id/orders/summary` — business order stats
- `GET /api/businesses/:id/orders` — business order list
- `GET /api/admin/orders` — all orders (admin)
- `POST /api/checkout/session` — create Stripe checkout session
- `POST /api/checkout/webhook` — Stripe webhook handler

### Subscriptions
- `GET /api/subscription-plans` — public active plans list
- `GET /api/admin/subscription-plans` — all plans (admin)
- `POST /api/admin/subscription-plans` — create plan
- `PUT /api/admin/subscription-plans/:id` — update plan
- `DELETE /api/admin/subscription-plans/:id` — delete plan
- `GET /api/admin/businesses/:id/subscription` — get business subscription
- `PUT /api/admin/businesses/:id/subscription` — assign/change plan
- `GET /api/businesses/:businessId/subscription` — business owner subscription view

### Applications
- `POST /api/businesses/apply` — submit application
- `GET /api/admin/applications` — list all applications (admin)
- `POST /api/admin/applications/:id/approve` — approve → creates business
- `POST /api/admin/applications/:id/reject` — reject with reason

### Admin
- `GET /api/admin/users` — all users
- `PATCH /api/admin/users/:id/role` — change role

### Content
- `GET/POST/PUT/DELETE /api/events`
- `GET /api/highlights` — public active highlights
- `GET /api/admin/highlights` — all highlights (admin)
- `POST/PUT/DELETE /api/highlights`
- `GET/POST/PUT/DELETE /api/businesses/:id/food-truck-locations`
- `GET /api/food-truck-locations/today`
- `GET/PUT /api/admin/settings/theme`
- `GET /api/admin/notification-logs`

---

## Known Remaining Issues

1. **No real Stripe subscription billing.** Plans exist for tiered access control and manual admin assignment only. A Stripe Products/Prices setup + recurring billing webhook would be needed to charge monthly.
2. **Business owner can access admin subscription plans endpoint.** `/api/admin/subscription-plans` checks for Clerk auth but not the ADMIN role. A role-guard middleware should be added.
3. **No email on application approval/rejection.** The notification infrastructure exists but approval/rejection emails are not sent.
4. **Cart only lives in localStorage.** No server-side cart persistence — refreshing on a different device clears it.
5. **Cart only lives in localStorage.** No server-side cart persistence — refreshing on a different device clears it.
6. **No pagination.** All list endpoints return full result sets — this will degrade at scale.
7. **No order search / filtering on the business dashboard.** Orders page shows all orders with no filter.
8. **`DialogContent` aria-describedby warnings.** Multiple dialogs are missing a `Description` for screen-reader accessibility.

---

## Recommended Next Steps

**High priority (before real users):**
1. Add role-guard middleware to all `/api/admin/*` routes (check `role === "ADMIN"` from the DB users table)
2. Wire up real Stripe recurring subscriptions (create Stripe Products, sync plan assignments as Stripe subscriptions, handle `invoice.paid` / `customer.subscription.updated` webhooks)
3. Add email notifications for application approve/reject using the existing `notifications.ts` infrastructure
4. Add pagination to `/api/businesses`, `/api/admin/orders`, `/api/admin/users`

**Medium priority:**
5. Server-side cart (useful for multi-device and abandoned cart recovery)
6. Order search + date filtering on the business dashboard
7. Rate limiting on public endpoints

**Nice to have:**
10. Business analytics charts (revenue over time, best-selling products)
11. Customer order history page
12. SMS notifications via Twilio for order status changes
13. Multi-image support for products

---

## Moving This to GitHub / Cursor / Junie

### Export from Replit

```bash
git remote add origin https://github.com/YOUR_USERNAME/local-order-hub.git
git push -u origin main
```

Or use **Replit → Git → Connect to GitHub** from the sidebar.

### Open in Cursor

1. Clone the repo: `git clone https://github.com/YOUR_USERNAME/local-order-hub.git`
2. Open the folder in Cursor
3. Create a `.env` file with all variables listed above
4. Run `pnpm install` then `pnpm --filter @workspace/db run push`
5. Start the two dev servers in separate terminals as shown in the "How to Run Locally" section
6. Set `VITE_CLERK_PROXY_URL=http://localhost:8080/api/__clerk` in your frontend `.env` and add `localhost` as an allowed origin in the Clerk dashboard

### Open in Junie (JetBrains AI plugin)

1. Clone the repo and open in IntelliJ / WebStorm
2. Junie reads the project structure and `replit.md` automatically — the project overview there gives it full context
3. Set up a `.env` file as above and run using the pnpm workspace commands

### Clerk Dashboard settings to update after leaving Replit

- Add your new domain to **Allowed Origins** and **Redirect URLs**
- Update or remove the **Proxy URL** setting depending on whether you self-host the Clerk proxy
- If removing the proxy: delete the `proxyUrl` from `ClerkProvider` in `App.tsx` and remove `clerkProxyMiddleware` from `app.ts`
