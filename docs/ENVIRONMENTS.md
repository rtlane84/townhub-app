# TownHub Staging and Production Environments

TownHub uses two isolated deployed environments. The existing Cloudflare frontend, Railway API, and test data become **staging**. Production is created separately and receives only approved production data.

## Canonical topology

| Surface | Staging | Production |
|---|---|---|
| Frontend | `https://staging.townhub.io` | `https://townhub.io` |
| Frontend alias | None | `https://www.townhub.io` redirects to `https://townhub.io` |
| API | `https://api-staging.townhub.io` | `https://api.townhub.io` |
| Cloudflare | Existing Worker, renamed/labeled staging | Separate Worker and deploy environment |
| Railway | Existing API service, labeled staging | Separate project/service |
| PostgreSQL | Existing Supabase TownHub project (`eajzpwkodnglonzxocep`, `ca-central-1`) | TownHub Production Supabase project (`ubntmzbkxyqsvihojcfp`, `us-east-1`) |
| Clerk | Development/staging instance | Production instance |
| Stripe | Test mode; staging webhook destinations | Live mode; production webhook destinations |
| Supabase storage | Staging project/bucket | Separate production project/bucket |
| Resend/Twilio | Staging sender/test recipients | Verified production sender/number |
| Sentry | `environment=staging` releases | `environment=production` releases |
| APNs | TestFlight release bundle targeting staging API | App Store release bundle targeting production API |

No database URL, secret key, webhook secret, storage service-role key, Clerk secret, signing token, or customer data may be shared between staging and production. A provider account may be shared only when it supplies strongly isolated projects, modes, or resources with separate credentials.

## Convert the current deployment to staging

1. Record the current Cloudflare Worker, Railway service, database, domains, Clerk instance, Stripe mode/webhooks, Supabase bucket, notification providers, Sentry projects, and all build/runtime variables. Record names and last four characters or provider IDs—never copy secret values into documentation.
2. Label or rename the existing Cloudflare and Railway resources as staging.
3. Attach `staging.townhub.io` and `api-staging.townhub.io`.
4. Set `DEPLOYMENT_ENVIRONMENT=staging` and `NODE_ENV=production` on the API. “Staging” describes data/provider isolation; Express still uses production runtime safeguards.
5. Set API `APP_BASE_URL` to the staging frontend and `NATIVE_ALLOWED_ORIGINS=capacitor://localhost`. Allow only the staging browser origin plus explicitly approved preview origins.
6. Set frontend `VITE_API_BASE_URL` to the staging API, `VITE_DISTRIBUTION_CHANNEL=web`, the staging Clerk publishable key, and staging Sentry DSN.
7. Confirm Stripe uses `sk_test_…` and create both staging webhook destinations/secrets for Connect and platform Billing.
8. Confirm staging uses non-production storage, sender identities, push credentials, admin recipients, and test accounts.
9. Run the environment gates:

   ```bash
   pnpm run release:check-env -- --environment staging --component api
   pnpm run release:check-env -- --environment staging --component frontend
   ```

10. Deploy, then complete the staging smoke matrix in [PRODUCTION.md](../PRODUCTION.md).

Existing test data may remain in staging. Do not copy it into production unless a specific, reviewed pilot-data import is approved.

### Staging database status — July 14, 2026

- A validated custom-format logical backup was created before the schema rollout.
- The reviewed Drizzle schema was applied to the staging project.
- All 31 application tables have RLS enabled with no `anon` or `authenticated` policies. Direct PostgREST table access is intentionally deny-all; the API server remains the sole application database boundary.
- Role-simulation checks confirmed that `anon` and `authenticated` read zero rows from representative identity, order, and device-token tables.
- The API database role retains the server access required by the current architecture, and the full API test suite passes.
- The production project has the reviewed schema, storage bucket, and locked-down public access applied. Off-host R2 logical backups and a restore drill into ephemeral Postgres completed on 2026-07-15 (see [DATABASE_BACKUP_AND_RECOVERY.md](DATABASE_BACKUP_AND_RECOVERY.md) §3.3.1). The Supabase production dashboard still reports the Free plan without provider PITR; upgrading remains recommended before higher traffic. Production pilot data must still be introduced deliberately.

## Create production

1. Create a new Railway project/service for the production API and connect it only to the TownHub Production Supabase PostgreSQL database.
2. Create a separate Cloudflare Worker/deploy environment, attach `townhub.io`, and redirect `www.townhub.io` to the apex domain.
3. Create or select the Clerk production instance. Configure only production origins, redirects, native application details, Apple connection, and authorized support/admin accounts.
4. Configure Stripe live mode. Create separate Connect and platform Billing webhook destinations pointing to the production API. Never reuse staging webhook secrets.
5. Apply the reviewed schema and access controls to the TownHub Production Supabase project, enable managed database backups, and create separate production storage and provider credentials. Verify bucket access and deletion procedures. (Schema, access controls, storage, provider separation, R2 logical backups, and the 2026-07-15 restore drill are complete; provider PITR on a paid plan remains recommended.)
6. Configure verified production email/SMS identities, Sentry projects/releases, uptime monitors, log drain, alert recipients, job scheduler, and APNs credentials.
7. Set `DEPLOYMENT_ENVIRONMENT=production`, production URLs, secrets, and build metadata.
8. Run the production environment gates for the API and frontend before deployment.
9. Apply schema changes only after a backup, staging verification, review of Drizzle output, and explicit production authorization.
10. Run post-deploy verification with test/pilot transactions before public announcement.

## Native build targeting

`VITE_API_BASE_URL` and `VITE_PUBLIC_WEB_URL` are compiled into the iOS bundle. A GitHub push or web deploy cannot change them in an installed build.

For a staging TestFlight build:

```bash
DEPLOYMENT_ENVIRONMENT=staging \
VITE_DISTRIBUTION_CHANNEL=app-store \
pnpm run release:check-env -- --environment staging --component native
pnpm --filter @workspace/townhub run ios:sync
```

For the App Store production candidate, rebuild with production values, increment the iOS build number, archive again, and repeat the native smoke matrix. Do not promote a staging-targeted binary to production review.

## Isolation verification

Before every release, record pass/fail evidence for these checks:

- Each frontend calls only its matching API.
- Each API connects only to its matching database and storage project.
- Staging Stripe is test mode; production Stripe is live mode.
- Webhook events appear only in the matching environment.
- A staging user, order, business, upload, notification, or deletion request never appears in production, and vice versa.
- Clerk keys and redirect allowlists match the environment.
- Sentry events contain the correct environment and release.
- Uptime and log alerts route to the correct on-call recipients.
- Native staging and production builds show the expected API/environment in Admin → Operations Center.

Any cross-environment result is an immediate release stop.

## Branch deployment wiring (Railway + Cloudflare)

Canonical branch mapping for automatic deploys:

| Git branch | API (Railway) | Frontend (Cloudflare Workers Builds) |
|---|---|---|
| `main` | Production API (`api.townhub.io`) | Production Worker / custom domains `townhub.io` (+ `www` redirect) |
| `develop` | Staging API (`api-staging.townhub.io`) | Staging Worker / custom domain `staging.townhub.io` |

### Verified on 2026-07-15

- Git branches `main` and `develop` both exist on `origin`.
- Public health checks returned HTTP 200 for `https://api.townhub.io/health`, `https://api-staging.townhub.io/health`, `https://townhub.io/`, and `https://staging.townhub.io/` (rechecked later the same day).
- Frontend isolation probe: `townhub.io` bundles `VITE` API origin `https://api.townhub.io`; `staging.townhub.io` bundles `https://api-staging.townhub.io`. Asset hashes differ between the two hosts.
- API isolation probe: production `GET /api/businesses` returned 0 businesses; staging returned 3. Staging theme `platformName` is `ClayTownHub`; production theme has no pilot platform name.
- Cloudflare Workers Builds for script `townhub-app` has a long history of successful deploys from **`main` only** (plus one historical `docs/agent-guidance` build). No `develop` builds were observed.
- Cloudflare Worker script `townhub-production` exists but has **zero** Workers Builds history — production or staging frontend automation is incomplete relative to the branch matrix below.
- Repo `wrangler.toml` now defines `[env.staging]` → `townhub-app` and `[env.production]` → `townhub-production` so Builds projects can deploy with `--env staging|production`.

### Dashboard actions still required

1. **Railway:** production service watches `main` only; staging service watches `develop` only. Confirm separate projects/services and that neither shares `DATABASE_URL` or webhook secrets. (Railway CLI not logged in from this operator environment.)
2. **Cloudflare Workers Builds:** create/confirm **two** Builds projects:
   - Staging: branch `develop`, deploy `npx wrangler deploy --env staging`, build env points at staging API + `pk_test_…`, domain `staging.townhub.io`.
   - Production: branch `main`, deploy `npx wrangler deploy --env production`, build env points at production API + `pk_live_…`, domains `townhub.io` / `www`.
3. **Uptime / alerts:** workflow `.github/workflows/uptime-health-check.yml` polls the four public URLs every 5 minutes via GitHub Actions. Still create Better Stack/UptimeRobot monitors with human alert routing, wire Railway log drain, and test alert delivery per [PRODUCTION_MONITORING.md](PRODUCTION_MONITORING.md).
4. Do not mark ENV-001 complete until Railway branch watches and Cloudflare dual Builds projects are confirmed. Do not mark OPS-002 complete until external monitor alert delivery is acknowledged.
