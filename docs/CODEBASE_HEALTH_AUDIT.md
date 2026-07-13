# TownHub Codebase Health Audit

**Audit date:** July 13, 2026  
**Scope:** Repository hygiene, architecture, dependencies, documentation, tests,
security boundaries, and static performance  
**Method:** Evidence-first review with conservative deletion  
**Runtime constraint:** No existing `.env` target was assumed safe for load or
provider-integrated testing

---

## Executive Summary

TownHub has a sound high-level architecture for a production beta: a
contract-first API, clear workspace boundaries, server-enforced authorization,
central notification orchestration, and meaningful unit/E2E coverage. The main
health risks are repository hygiene, a large frontend entry bundle, oversized
feature modules, unbounded administrative list endpoints, and accumulating
compatibility paths.

This audit completed the lowest-risk remediation immediately:

- stopped tracking 44,287 `.pnpm-store` cache files and added an ignore rule;
- restored a passing TypeScript baseline for notification preferences;
- corrected confirmed documentation drift;
- removed five confirmed-unused dependency declarations;
- aligned React/React DOM with Clerk's supported patched React 19 line;
- lazy-loaded public/customer pages, reducing the main entry bundle from
  1,160.02 kB to 933.68 kB minified (19.5%) and from 322.12 kB to 257.73 kB
  gzip (20.0%);
- removed the ineffective mixed static/dynamic Capacitor shell import;
- replaced full-row platform statistics reads with SQL counts and sums;
- added `pnpm run audit:health` and `pnpm run audit:health:bundle` guardrails.

Large module splits, pagination, shared live-event infrastructure, and legacy
compatibility removal remain separate follow-up tasks because they require
focused regression testing or production-data confirmation.

---

## Baseline

### Repository and source

| Measure | Before remediation | Current audit state |
|---|---:|---:|
| Git-visible files | ~45,296 | ~1,021 |
| Tracked `.pnpm-store` files | 44,287 | 0 |
| Local `.pnpm-store` disk usage | 639 MB | Retained locally, ignored by Git |
| TypeScript/TSX source files checked | 699 | 699 |
| API tests | 394 | 395 passed after adding one aggregate-query regression test; listener test requires localhost bind permission |
| Frontend tests | 250 | 250 passed |
| E2E specs | 12 | Not run against the unverified existing environment |

Removing the cache from the current Git tree does not remove it from historical
commits. Rewriting history is intentionally out of scope.

### Build output

| Artifact | Baseline | After route splitting | Result |
|---|---:|---:|---|
| Frontend main JS, minified | 1,160.02 kB | 933.68 kB | Improved 19.5% |
| Frontend main JS, gzip | 322.12 kB | 257.73 kB | Improved 20.0% |
| Frontend CSS, minified | 184.75 kB | 184.75 kB | No change |
| API bundled entry | 5.6 MB | 5.6 MB | No change |

The frontend production build still emits a chunk-over-500-kB warning. The
remaining entry contains application shell code plus React, Clerk, Sentry,
TanStack Query, generated client code, and Capacitor support. Further work
should use bundle composition evidence rather than an arbitrary manual-chunk
configuration.

Vite also emits sourcemap location warnings for several UI primitives even
though the build succeeds. These should be traced separately to the relevant
transform/plugin rather than suppressed globally.

### Quality baseline

- Shared libraries, frontend, mockup sandbox, scripts, and API now typecheck.
- Frontend and API production builds succeed.
- Frontend tests pass.
- API baseline had one non-product failure because the sandbox denied a local
  listener required by the rate-limit test; the remaining 393 assertions
  passed.
- Provider-integrated E2E and browser runtime metrics require an explicitly
  isolated local or staging environment.

---

## Architecture Map

```text
React/Vite routes
  -> generated TanStack Query hooks
  -> custom fetch (base URL + Clerk bearer token)
  -> Express route modules
  -> auth/role/ownership/feature middleware
  -> domain helpers and provider adapters
  -> Drizzle ORM
  -> PostgreSQL

OpenAPI contract
  -> Orval code generation
     -> React client
     -> shared Zod schemas

Domain event
  -> notification orchestrator
  -> email / SMS / Discord / ntfy / push adapters
  -> notification log

Order payment                  SaaS billing
  -> Stripe Connect             -> Stripe Billing
  -> pending checkout/order     -> business subscription
```

### Intended design patterns

| Concern | Established pattern | Assessment |
|---|---|---|
| API contract | `openapi.yaml` generates client hooks and schemas | Strong; preserve contract-first changes |
| Server state | Generated TanStack Query hooks and shared query keys | Strong; avoid one-off fetch/cache logic |
| Authentication | Clerk bearer tokens through the custom fetch bridge | Strong |
| Authorization | Route middleware plus owner/admin domain checks | Strong; negative tests cover critical paths |
| Multi-tenancy | Business ID scoped in API queries and mutations | Strong in audited critical routes |
| Payments | Connect orders separate from Billing subscriptions | Strong and well documented |
| Notifications | Domain orchestration separated from channel adapters | Strong; compatibility flags add complexity |
| Live operations | Business-scoped SSE with polling fallback | Appropriate for a single API instance |
| Native application | Capacitor shell around the deployed web app | Appropriate for beta; web/native imports need care |
| Database changes | Drizzle schema with push workflow and startup compatibility helpers | Functional, but legacy paths need retirement plans |

### Representative vertical slices

**Guest card order:** cart page → generated checkout-intent request → OpenAPI
checkout contract → order route → availability/tax/options helpers → pending
checkout table → Stripe Connect → webhook/confirm materialization → protected
confirmation URL.

**Business operations:** Business Hub page → generated business-order hooks →
authenticated route → owner/admin authorization → batched order serialization →
order tables → SSE event → query-cache refresh.

**Notifications:** order or appointment mutation → notification orchestrator →
category/preference resolution → provider adapters → `notification_logs`; guest
customer links receive signed order tokens while signed-in links rely on Clerk.

---

## Prioritized Findings

| ID | Severity | Confidence | Finding and evidence | Impact | Action / validation |
|---|---|---|---|---|---|
| HYG-001 | High | Confirmed | `.pnpm-store` contributed 44,287 tracked files and 639 MB locally | Slow clones, noisy diffs, inflated repository | **Completed:** ignore and untrack; verify health gate |
| BLD-001 | High | Confirmed | API typecheck failed on optional `userToggleable` access through a literal union | Broken release gate | **Completed:** typed helper preserves mandatory-category behavior; targeted tests and typecheck |
| DEP-001 | Medium | Confirmed | Clerk peer range rejected exact React/React DOM 19.1.0; no Expo package justified the stale pin comment | Unsupported peer combination | **Completed:** align both to 19.1.4 and refresh install/lockfile |
| PERF-001 | Medium | Confirmed | Frontend entry was 1,160.02 kB minified; public pages were statically imported | Slower initial parse/download | **Improved:** route lazy loading reduced entry 19.5%; maintain 1 MB hard budget |
| PERF-002 | Medium | Confirmed | Remaining entry is 933.68 kB and still triggers Vite warning | Initial-load and cache cost remains high | Analyze Clerk/Sentry/Capacitor/generated-client composition before next split |
| PERF-003 | Medium | Strong candidate | Today's food-truck feed awaits coordinate enrichment sequentially for each legacy row | External latency grows with rows | Profile with legacy coordinate gaps; add bounded concurrency or move enrichment to writes |
| API-001 | Medium | Confirmed | Several admin/public list endpoints return all matching rows | Response and memory growth | Add per-domain cursor/limit contracts after product UX is defined |
| API-002 | Medium | Confirmed | Admin platform stats loaded all businesses and orders, then aggregated in Node | Memory and latency grew with orders | **Completed:** use concurrent SQL counts/sum; preserve response shape; validate performance and authorization source tests |
| ARCH-001 | Medium | Confirmed | Six non-generated modules exceed 800 lines; `orders.ts` is 1,422 lines | High change collision and review risk | Split by domain responsibility without changing routes or response shapes |
| ARCH-002 | Medium | Confirmed | Mockup and production trees share 61 basenames, mostly UI primitives | Duplicate maintenance and dependency surface | Keep for now; decide whether mockup is an active workflow, then delete or isolate it |
| ARCH-003 | Medium | Strong candidate | API startup and runtime retain multiple legacy migrations/fallbacks | Ongoing reasoning and test burden | Inventory production data before removing any compatibility path |
| OPS-001 | Medium | Confirmed | SSE event bus is process-local | Live updates fail across multiple API instances | Keep single-instance beta constraint or introduce shared pub/sub before scaling |
| TST-001 | Medium | Confirmed | Frontend unit command only runs `src/lib/*.test.ts`; many page guarantees are source-level assertions | UI regressions rely heavily on E2E | Add focused component/integration tests for checkout and dashboard state changes |
| DOC-001 | Low | Confirmed | README/Tracker named React 18 and README/architecture described already-fixed guest/food-truck gaps | Misleading onboarding and planning | **Completed:** corrected current implementation truth |
| DEP-002 | Low | Confirmed | Frontend declared unused resolver, icon, and direct Zod packages; API declared unused cookie parser/types | Install and maintenance bloat | **Completed:** remove five declarations and refresh lockfile |
| DEP-003 | Low | Needs confirmation | Mockup manifest appears to contain unused resolver/date/motion/animation/Zod packages | Prototype-only install bloat | Retain until mockup ownership and use are confirmed |
| HYG-002 | Low | Confirmed | `attached_assets` contains historical prompts, not runtime assets | Repository noise | Keep read-only for now; remove only after product owner confirms no historical value |

No audited evidence justified deleting public routes, OpenAPI operations, database
tables, or compatibility code in this pass.

---

## Maintainability Hotspots

The automated threshold is 800 lines for non-generated TypeScript/TSX files.
It reports warnings rather than failing because file length alone is not proof
of a faulty design.

| Module | Lines | Recommended boundary |
|---|---:|---|
| API order routes | 1,422 | Order creation, reads/status, refunds, checkout, webhook registration |
| Public storefront page | 950 | Storefront state/controller, commerce catalog, business presentation |
| Admin platform settings | 936 | Branding, homepage/hero, weather, operational settings |
| List-your-business page | 854 | Application status, plan selection, multi-step form |
| Business settings page | 853 | Identity, commerce/fulfillment, hours, payment configuration |
| API business routes | 805 | Public reads, admin statistics, registration, owner mutations |

Refactors should preserve route modules as thin registration/composition layers,
keep authorization adjacent to the registered route, and move only cohesive
domain behavior or UI sections. Each split should be a separate change with no
API or visual redesign.

---

## Bloat and Dependency Classification

| Area | Classification | Decision |
|---|---|---|
| Generated API client/Zod files | Required generated output | Keep; edit source contract only |
| `.pnpm-store` | Local dependency cache | Untracked and ignored |
| Mockup sandbox | Prototype workspace | Retain pending owner confirmation |
| `attached_assets` | Historical source material | Retain read-only pending confirmation |
| Capacitor `ios` project | Required native project | Keep; generated Pods/build/public remain ignored |
| API `dist` and frontend `dist` | Generated build output | Keep ignored, never commit |
| Legacy checkout/product/notification aliases | Compatibility layer | Keep until production-data audit |
| Dev relink/debug routes | Operational/dev-only code | Keep; production mounting guards are tested |

Production dependency declarations were compared against imports, CSS plugins,
build scripts, type packages, and Capacitor tooling. Tooling-only and type-only
packages were not treated as unused solely because runtime source does not
import them.

---

## Documentation Truth Matrix

“Verified” means checked for role and obvious implementation contradictions in
this audit; it is not a provider-account verification.

| Document | Audience / canonical purpose | Owner | Audit action |
|---|---|---|---|
| `README.md` | Contributor entry point and quick start | Engineering | Updated versions and limitations; keep |
| `PROJECT_TRACKER.md` | High-level status; Linear owns active backlog | Product | Updated React version; keep lightweight |
| `docs/PRD.md` | Product scope, priorities, and acceptance criteria | Product | Keep canonical |
| `docs/ARCHITECTURE.md` | Current system design | Engineering | Updated guest-link behavior; keep canonical |
| `SECURITY.md` | Current auth, tenancy, and security model | Engineering/Security | Keep canonical |
| `docs/SECURITY_AUDIT_BETA.md` | Dated verification evidence | Security | Labeled as July 11 snapshot; do not treat as live model |
| `PRODUCTION.md` | Release and rollback checklist | Operations | Keep canonical release runbook |
| `docs/SETUP.md` | Local environment and provider setup | Engineering | Keep |
| `docs/OPERATIONS.md` | Runtime operations and scaling constraints | Operations | Keep |
| `docs/PRODUCTION_MONITORING.md` | Monitoring and incident visibility | Operations | Keep |
| `docs/DATABASE_BACKUP_AND_RECOVERY.md` | Backup/restore runbook | Operations | Keep; verify with each provider change |
| `docs/PLAYWRIGHT_E2E.md` | E2E environment and execution | QA/Engineering | Keep |
| `docs/NOTIFICATIONS.md` | Canonical notification architecture | Engineering | Keep canonical |
| `docs/BUSINESS_HUB_LIVE_NOTIFICATIONS.md` | SSE/toast/polling behavior | Engineering | Keep specialized guide |
| `docs/SUBSCRIPTION_NOTIFICATIONS.md` | Subscription lifecycle delivery | Product/Engineering | Keep specialized guide |
| `docs/STRIPE_SETUP.md` | Connect order-payment setup | Operations | Keep; distinct from Billing |
| `docs/STRIPE_BILLING_SETUP.md` | SaaS subscription setup | Operations | Keep; distinct from Connect |
| `docs/RESEND_SETUP.md` | Email provider setup | Operations | Keep |
| `docs/TWILIO_SETUP.md` | SMS provider setup | Operations | Keep |
| `docs/SENTRY_SETUP.md` | Error-monitoring setup | Operations | Keep |
| `docs/DEV_CLERK_RELINK.md` | Development-only identity repair | Engineering | Keep, clearly dev-only |
| `docs/IOS_APP.md` | Capacitor/iOS build and auth flows | Mobile/Engineering | Keep |

All relative Markdown link targets pass the automated health check.

---

## Performance Follow-up

### Frontend

1. Capture a bundle composition report and quantify Clerk, Sentry, Capacitor,
   generated client, and UI framework contributions.
2. Profile homepage, directory, storefront, cart, and authenticated dashboard in
   an isolated deployment using mobile throttling.
3. Consider deferring native-only provider modules on web only if the native
   initialization and splash flow can remain deterministic.
4. Add component-level performance work only after traces show render or query
   churn; file size is not runtime evidence.

### API and database

1. Add pagination to admin users/businesses/orders/applications and public
   content lists as data volume requires; update OpenAPI first.
2. Profile legacy food-truck coordinate fallback and notification fan-out before
   introducing concurrency.
3. Use query plans and representative staging data before adding indexes. The
   schema already includes tested hot-path indexes.

### Runtime acceptance measurements

Record p75 LCP/INP for public pages, p95 API latency for directory/storefront and
Business Hub lists, query count per request, payload bytes, and a cold/warm
navigation comparison. No load test should use the existing `.env` until its
target is explicitly confirmed as isolated.

---

## Guardrails

```bash
# Tracked-cache, broken-link, duplicate/hotspot report
pnpm run audit:health

# Production frontend build plus 1 MB entry-bundle budget
pnpm run audit:health:bundle
```

The health script fails when generated/cache directories are tracked, a relative
Markdown link target is missing, the requested frontend bundle is absent, or the
largest entry bundle exceeds 1,000,000 bytes. Oversized modules and mockup
overlap are reported for review but do not fail the build.

---

## Recommended Work Queue

1. Run the full release gate in an isolated test environment, including E2E.
2. Produce a bundle composition trace and target the next evidence-backed split.
3. Split the order route module without changing routes or response shapes.
4. Add pagination one domain at a time through the contract-first workflow.
5. Decide whether the mockup sandbox and historical prompt assets still provide
   enough value to keep.
6. Inventory legacy database values before removing compatibility code.
7. Add the health commands to CI when a repository CI workflow is established.
