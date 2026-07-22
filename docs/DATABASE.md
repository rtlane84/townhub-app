# TownHub database

Schema lives in [`lib/db/src/schema`](../lib/db/src/schema). There is **no** checked-in migration generation/application workflow — only Drizzle `push` / `push-force`.

## Domains and important relationships

| Domain | Tables (representative) | Notes |
|--------|-------------------------|-------|
| Identity | `users`, `account_deletion_requests` | Clerk user id is the primary key for users |
| Businesses | `businesses` | `ownerId` → single owner; multi-business ownership is many rows, not staff roles |
| Catalog | `categories`, `products`, modifier groups/choices, legacy `product_option_*` | Prefer modifier groups for new work; legacy options still exist until fully migrated |
| Food truck | `food_truck_locations` | Mobile schedule for ordering availability |
| Orders | `orders`, `order_items`, `order_item_options`, `pending_checkouts`, `order_refunds`, `stripe_webhook_events`, `order_idempotency_keys` | Card checkout materializes a durable order only after verified payment |
| Subscriptions | `subscription_plans`, `subscription_features`, `plan_features`, `business_subscriptions` | Feature gates enforced by the API |
| Community | `events`, `highlights`, `appointment_requests`, `business_applications` | Appointments are requests, not guaranteed calendar bookings |
| Notifications | `notification_logs`, `user_notification_preferences`, `device_tokens` | Delivery attempts are logged |
| Platform / media | `platform_settings`, `media_assets` | Single-row platform branding (town name, theme, weather); **not** multi-locality isolation |

**Money:** product and order price fields are decimal dollars unless a field explicitly documents cents (refund / pending-checkout aggregates). Do not divide by 100 in the frontend by default.

**Tenancy:** data is scoped by `businessId` / ownership. There is no `localityId`. Clay-first pilot scope: [adr/0005-clay-first-pilot-scope.md](adr/0005-clay-first-pilot-scope.md).

## How schema changes are applied

```bash
# Preview and apply (local / explicitly authorized databases only)
pnpm --filter @workspace/db run push

# Destructive local-only force (never against shared/staging/prod without explicit approval)
pnpm --filter @workspace/db run push-force
```

Rules:

1. Define changes under `lib/db/src/schema` and export through the schema index.
2. Always review the SQL preview. Stop on unexpected drops or rewrites.
3. Plan defaults/backfills for required columns on existing rows.
4. Never run `push` / `push-force` against an unknown or non-local database without explicit authorization.
5. Do **not** add new startup `ensure-*` DDL as a shortcut. Existing `ensure-*` helpers in the API are compatibility debt.

## Supabase / RLS

Application tables enable RLS with no `anon` / `authenticated` policies. Browser clients must not query Postgres directly. The API uses the server database role; the Supabase service-role key is for Storage only. See [../SECURITY.md](../SECURITY.md).

## Backups and recovery

Operational runbook: [DATABASE_BACKUP_AND_RECOVERY.md](DATABASE_BACKUP_AND_RECOVERY.md) (nightly logical dump to Cloudflare R2, restore drill, RPO/RTO).

GitHub Actions secrets (`SUPABASE_DB_URL`, `CF_*`) are documented there and pointed from [`.env.example`](../.env.example) — they are not local app env vars.

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — table list and payment flows
- [lib/db/AGENTS.md](../lib/db/AGENTS.md) — agent/schema rules
- [PRODUCTION.md](../PRODUCTION.md) — pool settings and production rollout checklist
