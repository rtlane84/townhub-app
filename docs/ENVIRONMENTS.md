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
- The production project is provisioned but remains empty. Applying schema or data to it requires a backup/recovery plan, reviewed Drizzle output, and explicit production authorization.

## Create production

1. Create a new Railway project/service for the production API and connect it only to the TownHub Production Supabase PostgreSQL database.
2. Create a separate Cloudflare Worker/deploy environment, attach `townhub.io`, and redirect `www.townhub.io` to the apex domain.
3. Create or select the Clerk production instance. Configure only production origins, redirects, native application details, Apple connection, and authorized support/admin accounts.
4. Configure Stripe live mode. Create separate Connect and platform Billing webhook destinations pointing to the production API. Never reuse staging webhook secrets.
5. Apply the reviewed schema and access controls to the TownHub Production Supabase project, enable managed database backups, and create separate production storage and provider credentials. Verify bucket access and deletion procedures.
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
