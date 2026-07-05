# TownHub — Project Status

Lightweight overview of the TownHub (LocalOrderHub) platform. **Active development, milestones, and task tracking live in Linear.**

---

## Status

TownHub is in active development toward production launch for a local town/county marketplace. Core ordering, appointments, subscriptions, notifications, media uploads, and admin tooling are implemented. Security hardening for guest checkout, catalog auth, and feature gates is complete.

---

## Current Milestone

**Production readiness** — verifying end-to-end flows, documentation accuracy, deployment checklists, and operational monitoring before onboarding real businesses.

---

## Product Vision

A local hub where residents discover businesses, place orders, request appointments, follow food truck locations and community events, and support town commerce — without every business building its own website.

Storefront modes: ordering, appointment requests, information-only, food truck schedule, service/contact.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind, shadcn/ui, wouter, TanStack Query, Clerk |
| Backend | Express 5, TypeScript, Drizzle ORM, PostgreSQL |
| API contract | OpenAPI 3 → Orval codegen |
| Payments | Stripe Connect (orders) + Stripe Billing (subscriptions) |
| Media | Supabase Storage |
| Notifications | Resend/SMTP + Twilio |
| Monitoring | Sentry |

---

## Major Completed Features

### Marketplace

- Public homepage, business directory, storefronts, cart, checkout
- Guest and signed-in checkout with guest order access tokens
- Order confirmation, customer order history (`/my-orders`)
- Community events, highlights, food truck map
- Weather widget, public pricing page, help center

### Business operations

- Business application and admin approval flow
- Owner dashboard: orders, kitchen view, products, categories, modifier groups
- Appointment request workflow (request-based, not instant booking)
- Structured business hours, payment modes, notification settings
- Stripe Connect onboarding per business
- Subscription billing and feature-gated capabilities
- Supabase media library with business-scoped uploads

### Platform admin

- Business and application management
- User role assignment
- Subscription plans and feature catalog
- Events and highlights management
- System status (health checks + notification logs)

### Security and infrastructure

- Clerk auth with Bearer token pattern for iframe compatibility
- Admin route guards, catalog mutation auth, guest order token protection
- Server-side subscription feature gates and inactive-business checks
- Rate limiting on public write endpoints
- Sentry error monitoring (API + frontend)
- Email/SMS notification delivery with audit logging

---

## Active Development

Track current work, bugs, and roadmap items in **Linear**.

When starting a task, check Linear for assignment and acceptance criteria. Do not rely on this file for backlog items.

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | Project landing page |
| [docs/SETUP.md](docs/SETUP.md) | Local development setup |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design |
| [SECURITY.md](SECURITY.md) | Security model |
| [PRODUCTION.md](PRODUCTION.md) | Deployment checklist |

---

## Repository

Monorepo at `local-shop-hub` (pnpm workspaces). Main packages:

- `artifacts/api-server` — Express API
- `artifacts/local-order-hub` — React frontend
- `lib/api-spec`, `lib/api-client-react`, `lib/api-zod`, `lib/db` — shared libraries
