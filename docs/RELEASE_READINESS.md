# TownHub Release Readiness

**Baseline commit:** `833f4f12`
**Audit started:** July 14, 2026
**Latest audit update:** July 16, 2026
**Target:** controlled production web beta followed by iPhone TestFlight and App Store release

This is the live release-blocker ledger. Dated audit reports under `docs/` are
evidence snapshots; this document owns the current go/no-go state. A finding is
closed only when its implementation and required validation are complete.

## Current validation baseline

| Check | Result | Evidence / limitation |
|---|---|---|
| Repository health | Pass | `pnpm run audit:health` |
| Typecheck | Pass | `pnpm run typecheck` — July 16 fix adds the package-local Node types needed by the API-client Node test |
| Frontend tests | Pass | 298/298 across 90 suites |
| API tests | Pass | 453/453 across 146 suites when permitted to open the temporary localhost listener used by the rate-limit test (July 16) |
| Production build | Pass | `pnpm run build` passed July 16; bundled Vite production build and unsigned iPhone-simulator Release build are also recorded |
| Provider E2E | Pass for current web gate | 2026-07-16 staging: public **3/3**, owner **4/4**, admin **2/2**, hosted Stripe checkout **1/1**, and full refund **1/1** passed. The Stripe helper handles prefilled email summaries and the current agent-disclosure control. Broader public/guest/owner/admin **11/11** was recorded 2026-07-15. Signed archive and devices remain |
| Physical iPhone | In progress | Cap production auth (Apple returning, Google new/returning, Account sign-out UI) verified 2026-07-15. Staging native env gate, bundle preparation, and unsigned Release build passed 2026-07-16; local keychain currently has zero valid signing identities, so Apple Distribution certificate refresh + full matrix + signed archive remain required before internal TestFlight |

## Release blockers

| ID | Priority | Area | Finding | Required outcome | Status |
|---|---|---|---|---|---|
| IOS-001 | P0 | Native packaging | Capacitor `server.url` loads remotely deployed executable web code | TestFlight/App Store builds bundle reviewed Vite assets and call only the selected remote API | Complete |
| IOS-002 | P0 | Account lifecycle | No in-app account-deletion workflow or API exists | Authenticated, idempotent deletion request and audited anonymization/provider cleanup flow | Complete: contract/API/UI/schema/runbook live; staging customer provider-cleanup rehearsal recorded 2026-07-15 (Clerk delete, token/pref purge, anonymize+DISABLE, request COMPLETED); owner/Stripe/Apple paths remain checklist-driven for first real case |
| IOS-003 | P0 | Authentication | iOS offers Google social login without Sign in with Apple | Equivalent Sign in with Apple path configured through Clerk and native return flow | Complete: native ASAuthorization Apple + GIDSignIn Google with Clerk token exchange; Production returning Apple + Google new/returning verified 2026-07-15 (SignIn-first + fresh SignUp token; bot CAPTCHA off for Cap); brand-new Apple still needs a second Apple ID for formal smoke |
| IOS-004 | P0 | Privacy | No app privacy manifest, legal routes, or verified App Store privacy inventory | Privacy manifest, privacy/terms/support pages, retention policy, and accurate disclosures | Complete: routes + PrivacyInfo; App Privacy published on TownHub Local (`6791258844`) 2026-07-15 (see `docs/APP_STORE_PRIVACY.md`); soft follow-ups = first-archive Privacy Report + optional counsel |
| IOS-005 | P0 | Store billing | Owner Stripe Billing subscribe/change/portal flows are reachable from the shared app | Store builds retain plan status but suppress owner SaaS purchase and billing-management calls to action | Complete |
| ENV-001 | P0 | Environments | Staging and production isolation is not implemented or verified | Separate domains, data, credentials, webhooks, storage, identity, payments, push, and monitoring | Complete: domains/data/Clerk/Stripe/Supabase isolation verified; Cloudflare Builds `develop`→`townhub-app` / `main`→`townhub-production`; Railway staging trigger set to `develop`, production remains `main`; production Google OAuth custom credentials + consent published 2026-07-15 |
| DB-001 | P0 | Database security | Supabase reported RLS disabled and broad `anon`/`authenticated` access on the staging public schema | Remove public PostgREST access or enable reviewed RLS policies in staging, verify direct API access, and apply the locked-down posture to production | Complete: staging and production schema/RLS lockdowns applied and verified; API remains the application database boundary |
| OPS-001 | P0 | Recovery | Production restore drill is not verified | Managed backups enabled and a restore drill recorded before real orders | Complete: R2 archive `townhub-production-2026-07-15T04-35-16Z.zip` from backup run `29389309625`; restore drill run `29389988277` into ephemeral Actions Postgres verified 31 public tables and representative row counts; nightly 02:00 UTC backup schedule enabled |
| OPS-002 | P1 | Monitoring | Better Stack receives errors and the production API health monitor alerts the owner, but the 2026-07-17 audit found sensitive exception text, one-monitor plan limits, and no backup team member | Deploy and verify Sentry sanitization; confirm Telemetry Live Tail; document GitHub Actions as approved frontend/API coverage until Better Stack upgrade; add and test backup routing | In progress: privacy scrub + Clerk conflict hardening deployed 2026-07-18; Locomotive ingest probe returned 202; remaining: Live Tail UI confirmation, backup recipient, and optional paid monitors |
| CI-001 | P1 | Release gates | Repository had no checked-in CI workflow | CI enforces health, typecheck, tests, build, and CodeQL | Complete |
| IOS-006 | P1 | Device scope | Xcode target currently declares iPhone and iPad while v1 scope is iPhone-only | Target, metadata, screenshots, and QA matrix align to iPhone-only v1 | Complete |
| DOC-001 | P1 | Documentation | Production guidance mixes current Cloudflare/Railway, Replit, and obsolete Netlify references | One canonical environment/release path; historical alternatives clearly labeled or removed | Complete |
| TST-001 | P1 | Release QA | No completed staging E2E, native archive, or physical-device release matrix | Customer, owner, and full admin workflows pass required web/native tests | In progress: web staging gate passes, including hosted Stripe payment and refund; Cap production auth smoke partial; **remaining = signed archive + physical matrix** (see below) |

## Next session — TestFlight gate (TST-001)

Do this in order from a clean `develop` tree for staging. Promote the verified commit to `main` only for the production candidate.

1. **Staging Stripe E2E — passed 2026-07-16; rerun before promotion**

```bash
E2E_BASE_URL=https://staging.townhub.io \
E2E_API_URL=https://api-staging.townhub.io \
E2E_STRIPE_CHECKOUT=1 \
pnpm exec playwright test tests/e2e/workflows/stripe-checkout.spec.ts
```

Refresh owner auth storage first if sessions expired (`docs/PLAYWRIGHT_E2E.md`).

2. **Internal TestFlight build (staging API)** — preferred first archive

```bash
pnpm release:ios:bump-build
pnpm release:ios:staging
pnpm release:ios:open
```

Xcode: Run on physical iPhone → smoke matrix below → **Product → Archive** → Validate → Upload to TestFlight. Day-to-day process: [RELEASE_PROCESS.md](./RELEASE_PROCESS.md).

3. **App Store candidate (production API)** — after internal TF looks good

```bash
pnpm release:ios:bump-build
pnpm release:ios:production
pnpm release:ios:open
```

Repeat smoke + archive. Never submit a staging-targeted archive as the App Store binary.

### Physical-device smoke (minimum for archive)

- [ ] Fresh launch; home shows ClayTownHub branding/data
- [ ] Apple returning user; Google; email; sign-out → Account shows real sign-in buttons (not skeleton)
- [ ] Guest or signed-in browse → cart → pay-at-pickup or card (system browser return)
- [ ] My Orders / List Your Business when signed in
- [ ] Owner Business Hub (if testing owner) — subscription CTAs suppressed in app-store channel
- [ ] Privacy / Terms / Help; Account deletion request UI reachable
- [ ] Safe areas / bottom tabs; airplane-mode launch recovers

Full matrix remains in `docs/IOS_APP.md` (Required physical-device matrix).

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
