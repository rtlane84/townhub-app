# TownHub — Production Database Backup & Recovery

Operational plan for protecting production data before and during first-town launch. This is **operational safety work** — not a customer-facing feature.

**Related:** [PRODUCTION.md](../PRODUCTION.md) (deploy, schema safety, and pool settings) and [PRODUCTION_MONITORING.md](PRODUCTION_MONITORING.md) (health and alerts).

---

## 1. What we are protecting

TownHub’s **system of record** is PostgreSQL (`DATABASE_URL`). The API uses Drizzle ORM with a push-based schema workflow (no migration files in repo).

| Store | Contents | Backup responsibility |
|-------|----------|---------------------|
| **PostgreSQL** | Businesses, products, orders, users/roles, subscriptions, applications, notification logs, media asset metadata | **Primary — this document** |
| **Supabase Storage** | Uploaded images (logos, hero images, media library) | Separate from Postgres; enable provider backups or periodic export |
| **Clerk** | Authentication identities | Clerk dashboard / support — not in `DATABASE_URL` |
| **Stripe** | Payments, Connect accounts, subscriptions | Stripe Dashboard — reconcile orders via `stripeSessionId` / webhooks after DB restore |
| **Deployment secret stores** | `DATABASE_URL`, API keys | Railway/Cloudflare secret stores; keep a secure break-glass inventory without copying values into this repository |

**First-town launch minimum:** automated **PostgreSQL** backups with a tested restore path. Media and secrets should not be an afterthought, but order/business data loss is the highest risk.

---

## 2. Production database topology (aligned with this repo)

| Layer | How TownHub uses it |
|-------|---------------------|
| **App hosts** | Cloudflare frontend and Railway API, isolated between staging and production |
| **Database** | Any PostgreSQL 14+ reachable via `DATABASE_URL` |
| **Connection pooling** | Optional provider pooler (Neon, Supabase, PgBouncer) plus the API `pg` pool documented in [PRODUCTION.md](../PRODUCTION.md) |
| **Media** | Supabase Storage by default (`SUPABASE_*` env vars) |

Production must use a separate managed PostgreSQL database with verified automated backups. Store its `DATABASE_URL` only in the production Railway environment.

### Recommended providers (first-town launch)

Choose **one** managed Postgres. All are compatible with TownHub’s `pg` + Drizzle stack.

| Provider | Why it fits | Backup features (typical) |
|----------|-------------|---------------------------|
| **[Neon](https://neon.tech)** | Serverless Postgres, pooler included, simple `DATABASE_URL` | Daily backups on paid tiers; **PITR** on higher tiers |
| **[Supabase](https://supabase.com)** | Postgres + Storage in one project if you already use Supabase for media | Daily backups; **PITR** on Pro plan |
| **Railway PostgreSQL** | Fits the current API host and environment model | Verify backup retention and restore support for the selected plan |

**Practical recommendation for launch:** use the managed provider that gives you visible automated backup history and a tested restore path; do not share the staging database.

---

## 3. Backup approach

### 3.1 Automated backups (required before real orders)

1. Create a **production-only** database (separate from dev/staging).
2. Enable the provider’s **automated daily backups** in the dashboard.
3. If budget allows, enable **point-in-time recovery (PITR)** — strongly preferred before scaling past a single town.
4. Record in your runbook:
   - Provider name and project ID
   - Backup schedule (e.g. daily 02:00 UTC)
   - Retention period (e.g. 7–30 days)
   - Who has dashboard access

**Acceptance for launch:** you can open the provider dashboard and see successful backup history for the production database.

### 3.2 Manual logical backup (recommended monthly + before schema pushes)

Use `pg_dump` for a portable snapshot. Run from a secure machine with network access to the database (not from the public browser).

```bash
# Custom format — compressed, supports pg_restore
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="townhub-$(date +%Y%m%d-%H%M%S).dump"

# Or plain SQL for inspection
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-acl \
  --file="townhub-$(date +%Y%m%d).sql"
```

**Storage:** encrypt at rest (e.g. password-protected archive) and store off-host (S3, Google Drive with 2FA, 1Password attachment). **Never commit dumps to git.**

**When to run manually:**

- Night before first production traffic
- Before any production `drizzle push` that is not purely additive
- After major data imports or admin bulk changes

### 3.3 Automated Supabase-to-R2 backup (TownHub beta)

TownHub includes `.github/workflows/production-db-backup.yml`. It creates separate roles, schema, and data dumps with the Supabase CLI, validates the archive, uploads it to a Cloudflare R2 bucket, and verifies the uploaded object. The first manual production run succeeded on 2026-07-15 (GitHub Actions run `29389309625`, archive `townhub-production-2026-07-15T04-35-16Z.zip` in R2 bucket `townhub-production-backups`). The nightly 02:00 UTC schedule is enabled after the restore drill below.

Restore drills use `.github/workflows/production-db-restore-drill.yml`, which downloads an R2 archive into an **ephemeral GitHub Actions Postgres** service (`townhub_restore_drill` on localhost). It never targets staging or production.

Before enabling this workflow, create a production-only R2 bucket and a bucket-scoped R2 API token, then add these GitHub Actions repository secrets:

| Secret | Value |
|--------|-------|
| `SUPABASE_DB_URL` | Production Supabase Session Pooler URI (port 5432) |
| `CF_ACCESS_KEY_ID` | R2 access key ID scoped to the backup bucket |
| `CF_SECRET_ACCESS_KEY` | R2 secret access key |
| `CF_BUCKET_NAME` | R2 bucket name |
| `CF_BUCKET_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |

Configure an R2 lifecycle rule for the retention period you want. The workflow protects PostgreSQL only; Supabase Storage media requires a separate export or provider-retention plan.

### 3.3.1 Restore drill record — 2026-07-15

| Field | Value |
|-------|-------|
| **Date (UTC)** | 2026-07-15 |
| **Backup run** | GitHub Actions `29389309625` (success; upload step verified) |
| **Archive** | `townhub-production-2026-07-15T04-35-16Z.zip` |
| **R2 bucket** | `townhub-production-backups` |
| **Restore target** | Ephemeral GitHub Actions Postgres `townhub_restore_drill` on localhost (not staging `eajzpwkodnglonzxocep`, not production `ubntmzbkxyqsvihojcfp`) |
| **Restore run** | GitHub Actions `29389988277` (success) |
| **Verification** | `public` tables = 31; core app tables present (`users`, `businesses`, `products`, `orders`, `platform_settings`, `subscription_plans`); row counts `users=1 businesses=0 products=0 orders=0 platform_settings=1 subscription_plans=2`; fresh `psql` connectivity to the restored database succeeded |
| **Notes** | Some Supabase `auth.*` / `storage.*` COPY statements error on plain Postgres stubs; TownHub application schema/data restored and counted successfully. Production remains empty of pilot businesses/orders by design. |

Repeat this drill quarterly (or after backup pipeline changes) via workflow_dispatch on `production-db-restore-drill.yml`.

### 3.4 Supabase Storage (media)

Postgres backups **do not** include image bytes in the storage bucket.

| Approach | Effort | Launch suitability |
|----------|--------|-------------------|
| Rely on Supabase project backups / replication | Low | Acceptable for first town if bucket is in the same backed-up project |
| Periodic `supabase storage` sync to cold storage | Medium | Better before high media volume |
| Re-upload from owners after DB-only restore | High | Last resort — document expected broken images until re-upload |

### 3.4 What we do not back up in-repo

- Drizzle schema is in git (`lib/db/src/schema/`) — redeploy code to recreate empty schema on a fresh database.
- Stripe and Clerk data must be reconciled operationally after a restore (see §5).

---

## 4. Recovery expectations (RPO / RTO)

Targets for **first-town launch** — adjust as you grow.

| Metric | With daily backups only | With PITR enabled |
|--------|-------------------------|-------------------|
| **RPO** (max data loss) | Up to ~24 hours | Minutes to ~1 hour (provider-dependent) |
| **RTO** (time to restore service) | 2–4 hours (manual) | 2–4 hours first time; faster with practice |

These assume a single operator following this runbook, not 24/7 on-call.

### Severity guide

| Scenario | Response |
|----------|----------|
| Accidental row delete / bad admin action | PITR or restore to new DB + selective data export; or restore yesterday’s dump to staging and copy rows |
| Full database corruption / host loss | Restore latest automated backup or `pg_dump` to new instance; update `DATABASE_URL`; redeploy |
| Schema mistake after bad `push` | **Stop.** Restore pre-push dump if data was damaged; never run `push-force` on production |

---

## 5. Restore runbook

### 5.1 Prerequisites

- Access to database provider dashboard (or backup file)
- Access to Railway production variables
- Admin Clerk account to verify auth after restore
- Maintenance window communicated to businesses if possible

### 5.2 Restore to a new database (safest)

Use this when testing or when the current instance is corrupted.

1. **Create a new empty database** in the provider (or from backup “Restore” UI).
2. **Restore backup** using provider UI **or**:
   ```bash
   pg_restore --dbname="$NEW_DATABASE_URL" \
     --no-owner \
     --no-acl \
     --verbose \
     townhub-YYYYMMDD.dump
   ```
   For plain SQL: `psql "$NEW_DATABASE_URL" -f townhub-YYYYMMDD.sql`
3. **Schema alignment:** if the restored DB is behind the deployed code, run additive schema only:
   ```bash
   DATABASE_URL="$NEW_DATABASE_URL" pnpm --filter @workspace/db run push
   ```
   **Read every line of SQL.** Cancel if Drizzle proposes drops or destructive changes.
4. **Update secrets:** set production `DATABASE_URL` to the new connection string in Railway production variables.
5. **Redeploy / restart** the Railway API so all instances pick up the new URL.
6. **Verify:**
   - `GET /health` → 200
   - Admin → System Status → database healthy
   - Spot-check businesses, recent orders, owner login
   - Place a test pay-at-pickup order in staging or with a test business
7. **Stripe:** confirm recent paid orders show correct `paymentStatus`; replay or inspect webhooks in Stripe Dashboard if needed.
8. **Media:** open storefront images; re-upload if storage was not restored.

### 5.3 In-place restore (provider PITR)

When the provider supports **point-in-time recovery**:

1. Choose restore timestamp **just before** the incident.
2. Restore to a **new branch/instance** (Neon) or **new project** (Supabase) — avoid overwriting until verified.
3. Follow steps 3–8 above.

### 5.4 After restore

- Post in admin notification channel / email owners if orders were lost or duplicated.
- Document incident: time, cause, backup used, data loss window.
- Schedule a **restore drill** if this was the first real recovery.

---

## 6. Pre-launch checklist

Complete before accepting real customer orders:

- [ ] Production database is **not** shared with local dev
- [x] Automated daily backups **enabled** (R2 upload workflow + nightly 02:00 UTC schedule; provider Free-plan native backups still absent)
- [x] At least one **successful production R2 archive** stored off-host (`townhub-production-2026-07-15T04-35-16Z.zip`)
- [x] **Restore drill completed** once (ephemeral Actions Postgres, 2026-07-15; see §3.3.1)
- [ ] `DATABASE_URL` documented in secure ops vault (not in git)
- [ ] Supabase Storage bucket identified; backup/replication understood
- [ ] Operator knows who can access the database provider and Railway production variables
- [ ] [PRODUCTION.md](../PRODUCTION.md) post-deploy verification completed

---

## 7. Ongoing operations

| Cadence | Action |
|---------|--------|
| **Weekly** | Glance at backup success in provider dashboard |
| **Monthly** | Fresh `pg_dump` to encrypted off-host storage |
| **Before prod schema change** | Manual dump + review Drizzle SQL preview |
| **Quarterly** | Repeat restore drill to non-production database |

---

## 8. Environment-specific notes

### Railway deployment

- Set `DATABASE_URL` in the isolated Railway production environment. Prefer the **Supabase Session Pooler** URI (port **5432**) for the Node `pg` pool — see [PRODUCTION.md](../PRODUCTION.md) connection pool notes. Staging and production must each use their own project URI.
- Set `DATABASE_POOL_MAX=20` (or `25`) on the TownHub API service for staging and production. Do not exceed the provider’s allowed connections.
- After changing either variable, redeploy or restart the API so every instance reloads the value.
- Staging and local databases must never use the production URL.

### Neon

- Use the pooled connection string for the API if recommended in the Neon dashboard.
- Enable backup retention in project settings; use **Restore** or branch from backup for drills.

### Supabase (database + storage)

- Same project often hosts both Postgres and the media bucket — confirm backup scope covers both.
- Database connection string: Project Settings → Database → URI (use pooler mode for serverless/API).
- The TownHub Production Supabase project was checked on 2026-07-14. Its dashboard reports the **Free** plan and states that project backups are not included. Off-host R2 logical backups plus the 2026-07-15 restore drill satisfy the launch recovery path; upgrading to a paid plan with provider PITR remains recommended before higher traffic.

---

## 9. References

- Schema changes and pool settings: [PRODUCTION.md](../PRODUCTION.md)
- Deploy & env vars: [PRODUCTION.md](../PRODUCTION.md)
- Health monitoring: [PRODUCTION_MONITORING.md](PRODUCTION_MONITORING.md)
- Security model: [SECURITY.md](../SECURITY.md)
