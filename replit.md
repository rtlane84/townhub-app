# LocalOrderHub

A multi-tenant "shop local" ordering marketplace SaaS. Customers browse and order from participating local businesses (florists, diners, greenhouses, etc.). Three roles: Customer, Business Owner, Platform Admin.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000/8080)
- `pnpm --filter @workspace/local-order-hub run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + shadcn/ui, wouter routing, TanStack Query
- Auth: Clerk (managed instance, via `@clerk/react` + `@clerk/express`)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`, Orval-generated Zod schemas
- Payments: Stripe (mock fallback when `STRIPE_SECRET_KEY` not set)
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract, source of truth
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks
- `lib/api-zod/src/generated/` — Orval-generated Zod schemas
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, businesses, categories, products, orders)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/stripe.ts` — Stripe with mock fallback
- `artifacts/local-order-hub/src/pages/` — All frontend pages
- `artifacts/local-order-hub/src/components/cart-context.tsx` — Cart state (localStorage-backed)

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives codegen for both client hooks and server Zod validation schemas
- **Clerk proxy pattern**: All Clerk FAPI calls proxied through `/api/__clerk` for custom domain support
- **Prices as dollar floats**: Prices are stored as `numeric(10,2)` in DB and returned as `parseFloat()` from API — do not divide by 100 in the frontend
- **Cart is per-business**: Adding items from a different business clears the cart (with confirmation prompt)
- **Stripe mock fallback**: When `STRIPE_SECRET_KEY` is not set, checkout returns a mock success URL

## Product

- **Customers**: Browse business directory → View storefront → Add to cart → Checkout (Stripe or pay-at-pickup) → Order confirmation
- **Business owners**: Dashboard with today's orders, revenue, and order management; product and category CRUD; settings
- **Platform admins**: Full business management, user role assignment, platform-wide order view and stats
- **Demo businesses**: Hometown Floral (florist), Main Street Diner (food vendor), Clay Greenhouse (garden market)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Price display**: API returns prices as dollar floats. Do NOT divide by 100 in frontend.
- **Route ordering**: `GET /api/businesses/stats` and `GET /api/businesses/manage/:id` must be registered BEFORE `GET /api/businesses/:slug` to avoid slug-matching those paths.
- **Orval TS2308**: Operations with both path AND query params cause collision. Filter via `req.query` in handlers instead of spec query params.
- **CSS @import order**: Google Fonts must be loaded via `<link>` in index.html, not `@import url()` in index.css — PostCSS processes tailwind first, which pushes the url() import past other rules.
- **DB push**: Run `pnpm --filter @workspace/db run push` after any schema changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the full API contract
