# Deployment

TownHub deploys the Express API separately from the Cloudflare-hosted frontend. Staging and production must use separate domains, databases, Clerk instances/keys, Stripe webhook secrets, storage, and monitoring configuration.

Use Node.js 24 for deployed API builds, matching CI and the repository `engines` field.

## Release flow

1. Confirm the target environment and review current changes.
2. Run typecheck, API/frontend tests, build, and the relevant E2E workflows.
3. Verify required secrets and build-time `VITE_*` values with `pnpm run release:check-env`.
4. Back up before production schema work; review the Drizzle SQL; deploy API and frontend.
5. Smoke-test health, sign-in, public directory, authorized dashboards, checkout, webhook processing, and monitoring.
6. Tag the deployed commit and record release evidence in `docs/history/`.

## Rollback

Roll back frontend/API to the previous known-good release first. Do not roll back database schema or data blindly: assess compatibility, restore only through the documented recovery process, and reconcile payments/webhooks before reopening ordering.

## iOS

Native releases require the correct `.env.native.staging` or `.env.native.production` file before the Capacitor build. Follow [IOS_APP.md](IOS_APP.md) for TestFlight, device verification, and App Store steps.

## Production rules

- Mock payments are blocked in production.
- A production schema push requires a verified target, backup, and approval.
- The scheduled jobs endpoint requires `JOB_SECRET`; configure the scheduler and alert on missed runs.
- Keep staging and production isolated; branding configuration is not locality-level tenancy.
