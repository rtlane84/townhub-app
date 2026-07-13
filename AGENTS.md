# TownHub Repository Instructions

These instructions apply to the entire repository. Follow them before making changes. If a more specific `AGENTS.md` is added beneath a directory later, its instructions take precedence for files in that subtree.

## Product Context

TownHub is a multi-tenant local commerce SaaS and community marketplace. Residents discover businesses, place pickup or delivery orders, request appointments, follow food trucks, and view community events. Business owners manage their storefronts and daily operations. Platform administrators manage the marketplace, plans, businesses, users, and platform health.

Clay is the confirmed first pilot locality: make its deployment and first businesses reliable before geographic expansion. TownHub is intended to serve many localities eventually, but locality-level data isolation and operations are not established by the current configurable branding alone. Do not hardcode Clay into reusable commerce, identity, billing, or notification logic; future multi-locality support requires an explicit architecture decision.

The current objective is a safe, reliable production beta—not maximum feature count. Prioritize work that:

1. fixes a security, payment, data-integrity, or reliability risk;
2. unblocks a pilot business or customer journey;
3. improves business-owner operations;
4. supports measurable activation, retention, or revenue.

Read `docs/PRD.md` for product scope and acceptance criteria, `docs/ARCHITECTURE.md` for system design, `SECURITY.md` for authorization rules, and `PRODUCTION.md` for release requirements.

## Repository Map

| Path                        | Purpose                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `artifacts/townhub`         | React/Vite web application and Capacitor iOS shell                            |
| `artifacts/api-server`      | Express 5 API, webhooks, jobs, and provider integrations                      |
| `artifacts/mockup-sandbox`  | Isolated UI mockup/prototyping workspace; not the production app              |
| `lib/api-spec/openapi.yaml` | API contract and source of truth for generated clients/schemas                |
| `lib/api-client-react`      | Orval-generated React Query client and custom fetch bridge                    |
| `lib/api-zod`               | Generated and hand-maintained shared Zod schemas                              |
| `lib/db`                    | Drizzle schema, database exports, and database push commands                  |
| `tests/e2e`                 | Playwright customer, owner, admin, and workflow tests                         |
| `docs`                      | Product, setup, architecture, operations, and provider documentation          |
| `attached_assets`           | Historical prompt/source material; treat as read-only unless explicitly asked |

## Technology and Runtime

- Use Node.js, TypeScript, and pnpm workspaces.
- Use the pnpm version declared in the root `package.json`.
- Do not use npm or Yarn and do not create their lockfiles.
- The frontend uses React, Vite, Tailwind, shadcn/ui, wouter, and TanStack Query.
- The API uses Express 5, Clerk, Drizzle ORM, PostgreSQL, and Zod.
- The API is contract-first: OpenAPI generates the React client and API schemas.
- Stripe Connect handles customer order payments; Stripe Billing handles business subscriptions. These are separate payment domains.

## Setup and Common Commands

Run commands from the repository root unless noted otherwise.

```bash
pnpm install
cp .env.example .env
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/townhub run dev
```

Local services:

- Frontend: `http://localhost:23032`
- API: `http://localhost:8080`
- Health check: `http://localhost:8080/health`

Quality commands:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/townhub run test
pnpm run test:e2e
pnpm run build
```

Useful targeted commands:

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/townhub run typecheck
pnpm --filter @workspace/api-spec run codegen
pnpm exec playwright test tests/e2e/smoke/public-pages.spec.ts
```

E2E tests default to the local frontend and API. Some workflows require configured Clerk, database, Stripe test-mode, and test-account environment variables. Read `docs/PLAYWRIGHT_E2E.md` before diagnosing environment-dependent failures.

## Working Method

Before editing:

1. Read the relevant implementation, nearby tests, and applicable product/security documentation.
2. Inspect the working tree and preserve unrelated user changes.
3. Trace the full vertical slice: database, API contract, generated types, server authorization, UI states, notifications, tests, and documentation.
4. State assumptions when behavior is not discoverable from the repository.

While editing:

- Make the smallest coherent change that satisfies the requirement.
- Follow established patterns before introducing abstractions or dependencies.
- Keep unrelated cleanup out of the change.
- Do not silently change product behavior to make a test pass.
- Add or update tests with behavior changes and bug fixes.
- Update documentation when setup, environment variables, provider behavior, operational workflow, or architectural constraints change.

After editing:

1. Review the diff for accidental changes, generated artifacts, secrets, and tenant-boundary regressions.
2. Run targeted tests first, then broader checks proportional to risk.
3. Report exactly what passed, what failed, and what was not run.
4. Do not claim completion while a required check is failing because of the change.

## Contract-First API Changes

`lib/api-spec/openapi.yaml` is the API contract source of truth.

When an endpoint, request, response, or shared API type changes:

1. Update the OpenAPI contract.
2. Run `pnpm --filter @workspace/api-spec run codegen`.
3. Implement or update the API route using the generated schemas where appropriate.
4. Update frontend callers to use generated hooks/types.
5. Add route and UI tests for the behavior.
6. Run library and affected-package typechecks.

Do not hand-edit these generated files:

- `lib/api-client-react/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-zod/src/generated/api.ts`

If generated output is wrong, fix the OpenAPI contract, Orval configuration, or the documented post-generation fix script, then regenerate.

The guest order `?token=` behavior is intentionally described rather than modeled as an OpenAPI query parameter because doing so causes Orval type collisions. Preserve this exception unless the generator issue is explicitly resolved and verified.

## Database Changes

- Define schema changes in `lib/db/src/schema` and export them through the schema index.
- Use Drizzle patterns already present in the repository.
- Preserve multi-tenant ownership relationships and database constraints.
- Treat monetary values consistently with the existing schema: prices are decimal dollar values, not integer cents. Do not divide them by 100 in the frontend.
- Consider existing rows when adding required fields; provide a safe default or explicit backfill plan.
- Add uniqueness/idempotency constraints for payments, webhooks, and retryable operations where appropriate.
- This repository currently has `push` and `push-force` scripts, not a checked-in migration generation/application workflow. Describe an explicit rollout and backfill plan for production schema changes; do not invent migration commands.
- Existing `ensure-*` startup DDL under `artifacts/api-server/src/lib` is compatibility debt, not the preferred pattern for new schema changes. Do not add new runtime schema mutation as a shortcut.

Never run `push`, `push-force`, migrations, seed scripts, or data repair scripts against an unknown or non-local database without explicit user authorization. Never use `push-force` unless the user specifically requests and understands the destructive risk.

## Authentication, Authorization, and Tenancy

Security rules are mandatory acceptance criteria.

- Clerk supplies identity; protected API calls use bearer tokens.
- Every sensitive read and mutation must have an explicit role or ownership check on the server.
- Business owners may access only businesses they are authorized to manage.
- Admin UI visibility does not replace `requireAdmin` or an equivalent API guard.
- Catalog mutations must retain business ownership/admin authorization.
- Subscription feature gates and inactive-business checks must be enforced by the API, not only hidden in the UI.
- Media uploads and lookups must be business-scoped.
- Never expose customer PII, Stripe identifiers, secrets, access tokens, or private notes in public responses, SSE events, logs, analytics, or error messages.

For guest orders:

- Preserve signed access-token authorization.
- Propagate the token through confirmation and checkout flows safely.
- Do not put tokens in logs or telemetry.
- Test missing, invalid, expired/tampered, and valid access paths.

Add negative authorization tests whenever changing protected resources: unauthenticated, wrong role, wrong business, inactive business, and missing feature access as applicable.

## Payments and Orders

- Stripe Connect customer payments and Stripe Billing subscriptions must remain separate.
- Card checkout uses `POST /api/checkout/intents`: persist a pending checkout, create Stripe Checkout as a direct charge on the business connected account, and materialize one durable `PAID` order only after verified payment. Pay-at-pickup uses `POST /api/orders` and creates a `PENDING` payment order immediately.
- The connected-account and platform webhook destinations share `POST /api/checkout/webhook`, but use separate signing secrets and event-domain routing. Connect order/refund events must not update subscriptions; platform Billing events must not update orders.
- Verify webhook signatures using the raw request body on the webhook route only.
- Webhook and checkout-confirmation handlers must be idempotent.
- Do not create a durable paid order before payment is confirmed.
- Preserve one-business-per-cart and one-business-per-order behavior.
- Server-side code must validate product and option availability, business commerce state, ordering hours or food-truck mobile schedule, pickup/delivery enablement, delivery address/minimum/fee, totals, tax, payment mode, and plan access.
- Food-truck location mutations require owner/admin access. Appointment requests remain requests (`NEW` through confirmed/declined/completed/canceled), not guaranteed calendar reservations.
- Refunds require authorization, an auditable database record, and safe retry behavior.
- Development mock payment behavior must fail closed in production.

Changes touching checkout, webhooks, order materialization, refunds, tax, totals, or guest access require targeted API tests and the relevant Playwright workflow whenever the environment supports it.

## Notifications and Live Updates

- Domain events feed the shared notification pipeline; do not duplicate notification business logic per provider or platform.
- Provider delivery is fire-and-forget and must not roll back a completed domain action.
- Every delivery attempt must be logged with a meaningful outcome.
- Missing providers may produce `LOGGED` delivery in development, but production configuration must not imply that a message was actually sent.
- Customer links must route to an authorized destination; guest links must include the necessary protected access without leaking it elsewhere.
- Critical Stripe/payment alerts remain mandatory and separate from optional notification preferences.
- SSE payloads must stay minimal and exclude PII.
- The current in-process live-event bus is valid only for a single API instance. Do not claim multi-instance live-update support without shared pub/sub infrastructure.

Read `docs/NOTIFICATIONS.md` and `docs/BUSINESS_HUB_LIVE_NOTIFICATIONS.md` before changing notification or live-update behavior.

## Frontend Conventions

- Use functional React components and hooks.
- Use generated TanStack Query hooks and query keys for API data when available.
- Keep server state in TanStack Query; do not mirror it into local state without a clear UI reason.
- Reuse existing shadcn/ui primitives, Tailwind tokens, layouts, error states, and loading components.
- Use the `@/` alias for frontend source imports and workspace package imports for shared libraries.
- Follow the existing TypeScript style: double quotes, semicolons, trailing commas in multiline structures, and explicit types at public boundaries.
- Avoid `any`; narrow `unknown` values and validate external input.
- Preserve wouter `BASE_PATH` behavior and use established navigation helpers.
- Include loading, empty, error, disabled, and success states for changed user flows.
- Core public and dashboard workflows must remain usable on mobile and by keyboard.
- Do not introduce a one-off visual system when established components and theme tokens can express the design.

## Mobile and Capacitor Gotchas

- TownHub's iOS app is a Capacitor shell around the deployed responsive web application.
- Web behavior must remain correct when adding native-only behavior.
- Google OAuth cannot run inside WKWebView; preserve the Safari bounce and deep-link flow.
- Stripe Checkout and Connect open in the system browser on native.
- `CAPACITOR_SERVER_URL` must match the deployed frontend, and production redirects depend on `APP_BASE_URL` alignment.
- Respect safe areas, native bottom-tab visibility rules, dashboard back navigation, and external-link handling.
- Do not edit generated Pods, build output, DerivedData, or copied Capacitor public assets.
- Run the iOS sync/build flow only for changes that affect Capacitor configuration, plugins, or the native bundle, and report if Xcode/device verification was not performed.

Read `docs/IOS_APP.md` before changing authentication, deep links, push registration, or native navigation.

## Dependencies and Supply-Chain Safety

- Prefer existing dependencies and platform APIs.
- Do not add, remove, or upgrade dependencies unless needed for the task.
- Keep `pnpm-lock.yaml` synchronized when dependencies intentionally change.
- Never weaken or remove `minimumReleaseAge`, `onlyBuiltDependencies`, overrides, or other supply-chain protections in `pnpm-workspace.yaml` merely to make installation easier.
- Do not add a package to `minimumReleaseAgeExclude` without explicit justification and user approval.
- Treat install scripts and new provider SDKs as security-sensitive.

## Files and Areas to Avoid

Unless explicitly required by the task:

- Do not modify `.env` or expose its contents. Update `.env.example` with placeholders when configuration changes.
- Do not edit `.git`, `.pnpm-store`, `node_modules`, build output, test reports, uploads, or IDE metadata.
- Do not edit files under `attached_assets`; they are historical inputs.
- Do not edit generated API files directly.
- Do not edit generated iOS dependency/build directories.
- Do not modify `pnpm-lock.yaml` without an intentional dependency change.
- Do not change deployment, Stripe, Clerk, Supabase, Twilio, Resend, APNs, Sentry, or production data/configuration unless the user asks for that external action.
- Do not stage, commit, push, open a pull request, deploy, or publish without explicit user authorization.

## Testing Expectations

Match validation to the risk of the change.

| Change                        | Minimum expected validation                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Documentation only            | Review links/commands and run `git diff --check`                                                  |
| Frontend component or page    | TownHub typecheck plus targeted unit/UI test; visually verify meaningful UI changes when possible |
| API route or middleware       | API typecheck plus targeted route tests                                                           |
| Shared API contract           | Codegen, library typecheck, affected frontend/API typechecks, targeted tests                      |
| Database schema or query      | Library/API typecheck, targeted tests, and an explicit migration/push plan                        |
| Auth/tenancy/security         | Positive and negative API tests; relevant E2E workflow when available                             |
| Checkout/payment/refund       | API tests and relevant Stripe/Playwright workflow; verify idempotency                             |
| Cross-cutting or release work | Full typecheck, package tests, E2E suite, and production build                                    |

If a required service or secret is unavailable, do not fabricate a passing result. Run every safe local check still available and explain the exact limitation.

There is currently no repository lint script or checked-in CI workflow. Do not claim `pnpm run lint` exists; recommend adding lint/CI separately if the task calls for it.

## Definition of Done

A change is done when:

- the requested behavior and acceptance criteria are satisfied;
- the implementation follows existing architecture and product scope;
- authorization, tenancy, payment, privacy, and failure states were considered;
- relevant tests were added or updated;
- targeted validation passes, with broader checks run in proportion to risk;
- generated clients are regenerated from the source contract when required;
- setup, operational, and product documentation is updated when behavior changes;
- the final diff contains no secrets, debug code, accidental generated files, or unrelated edits;
- the handoff states what changed, what was verified, and any remaining risks or manual steps.

Passing compilation alone is not done. A feature must work as an end-to-end TownHub workflow, including authorization and failure behavior.
