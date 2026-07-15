# TownHub Release Readiness

**Baseline commit:** `833f4f12`
**Audit started:** July 14, 2026
**Target:** controlled production web beta followed by iPhone TestFlight and App Store release

This is the live release-blocker ledger. Dated audit reports under `docs/` are
evidence snapshots; this document owns the current go/no-go state. A finding is
closed only when its implementation and required validation are complete.

## Current validation baseline

| Check | Result | Evidence / limitation |
|---|---|---|
| Repository health | Pass | `pnpm run audit:health` |
| Typecheck | Pass | `pnpm run typecheck` |
| Frontend tests | Pass | 298/298 across 90 suites |
| API tests | Pass | 448/448 across 146 suites when permitted to open the temporary localhost listener used by the rate-limit test |
| Production build | Pass | Bundled Vite production build and unsigned iPhone-simulator Release build |
| Provider E2E | Partial pass | 11 local E2E checks previously passed against staging data; 2026-07-15 staging-hosted public smoke 3/3 passed (`E2E_BASE_URL=https://staging.townhub.io`); Stripe Sandbox card-field selector, signed archive, and devices remain |
| Physical iPhone | Not run | Required before internal TestFlight |

## Release blockers

| ID | Priority | Area | Finding | Required outcome | Status |
|---|---|---|---|---|---|
| IOS-001 | P0 | Native packaging | Capacitor `server.url` loads remotely deployed executable web code | TestFlight/App Store builds bundle reviewed Vite assets and call only the selected remote API | Complete |
| IOS-002 | P0 | Account lifecycle | No in-app account-deletion workflow or API exists | Authenticated, idempotent deletion request and audited anonymization/provider cleanup flow | Complete: contract/API/UI/schema/runbook live; staging customer provider-cleanup rehearsal recorded 2026-07-15 (Clerk delete, token/pref purge, anonymize+DISABLE, request COMPLETED); owner/Stripe/Apple paths remain checklist-driven for first real case |
| IOS-003 | P0 | Authentication | iOS offers Google social login without Sign in with Apple | Equivalent Sign in with Apple path configured through Clerk and native return flow | In progress: Apple/Clerk configuration complete; native device validation remains |
| IOS-004 | P0 | Privacy | No app privacy manifest, legal routes, or verified App Store privacy inventory | Privacy manifest, privacy/terms/support pages, retention policy, and accurate disclosures | In progress: implementation complete; owner/legal review and App Store Connect questionnaire remain |
| IOS-005 | P0 | Store billing | Owner Stripe Billing subscribe/change/portal flows are reachable from the shared app | Store builds retain plan status but suppress owner SaaS purchase and billing-management calls to action | Complete |
| ENV-001 | P0 | Environments | Staging and production isolation is not implemented or verified | Separate domains, data, credentials, webhooks, storage, identity, payments, push, and monitoring | Complete: domains/data/Clerk/Stripe/Supabase isolation verified; Cloudflare Builds `develop`→`townhub-app` / `main`→`townhub-production`; Railway staging trigger set to `develop`, production remains `main` (staging had incorrectly watched `main`) |
| DB-001 | P0 | Database security | Supabase reported RLS disabled and broad `anon`/`authenticated` access on the staging public schema | Remove public PostgREST access or enable reviewed RLS policies in staging, verify direct API access, and apply the locked-down posture to production | Complete: staging and production schema/RLS lockdowns applied and verified; API remains the application database boundary |
| OPS-001 | P0 | Recovery | Production restore drill is not verified | Managed backups enabled and a restore drill recorded before real orders | Complete: R2 archive `townhub-production-2026-07-15T04-35-16Z.zip` from backup run `29389309625`; restore drill run `29389988277` into ephemeral Actions Postgres verified 31 public tables and representative row counts; nightly 02:00 UTC backup schedule enabled |
| OPS-002 | P1 | Monitoring | Sentry/health/Pino exist, but external uptime, log drain, alert routing, and release verification are unconfirmed | End-to-end staging and production monitoring with tested alerts and runbook | Complete: Better Stack uptime (owner ack’d test alert), Errors DSNs on Railway + Cloudflare with `environment` tags, Locomotive log drain staging+production → Telemetry Live Tail verified; free status page deferred (billing gate) |
| CI-001 | P1 | Release gates | Repository had no checked-in CI workflow | CI enforces health, typecheck, tests, build, and CodeQL | Complete |
| IOS-006 | P1 | Device scope | Xcode target currently declares iPhone and iPad while v1 scope is iPhone-only | Target, metadata, screenshots, and QA matrix align to iPhone-only v1 | Complete |
| DOC-001 | P1 | Documentation | Production guidance mixes current Cloudflare/Railway, Replit, and obsolete Netlify references | One canonical environment/release path; historical alternatives clearly labeled or removed | Complete |
| TST-001 | P1 | Release QA | No completed staging E2E, native archive, or physical-device release matrix | Customer, owner, and full admin workflows pass required web/native tests | In progress: staging-hosted public smoke 3/3 passed on 2026-07-15; prior 11 public/guest/owner/admin checks against staging data; Stripe hosted card automation, signed archive, and devices remain |

## Confirmed v1 product decisions

- iPhone v1 includes customer workflows, Business Hub owner operations, and the
  full role-protected admin dashboard.
- Business owners subscribe through authenticated web onboarding reached from
  their approval email. Store builds do not sell or steer to Stripe Billing.
- Customer payments for physical goods and services remain available.
- Help content remains bundled; changes to its code or copy require a native
  app update even though the website can deploy independently.
- The existing Cloudflare/Railway deployment and test data become staging.
- Production uses `townhub.io`, with `www.townhub.io` redirected to the apex; staging uses `staging.townhub.io`.
- The API uses `api.townhub.io` in production and `api-staging.townhub.io` in staging.
- Production uses isolated provider resources, including a separate Supabase project in `us-east-1`.
- Apple Developer enrollment is complete as an individual membership; Android follows iOS.

## Go/no-go rule

Production web beta requires all P0 environment, payment, security, recovery,
and monitoring findings closed. TestFlight additionally requires all `IOS-*`
P0 findings, a successful archive, and the physical-device smoke matrix. App
Store submission requires every P0 and P1 finding above closed or explicitly
accepted in writing with an owner and deadline.
