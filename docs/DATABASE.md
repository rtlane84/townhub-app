# Database

TownHub uses PostgreSQL and Drizzle. The schema source is `lib/db/src/schema`; the current workflow uses reviewed `drizzle-kit push`, not checked-in migrations.

## Main data areas

- Identity and access: users, business ownership, account-deletion requests, device tokens.
- Marketplace: businesses, categories, products, modifier groups, media, events, highlights, food-truck locations.
- Commerce: orders, order items/options, pending checkouts, refunds, idempotency and webhook records.
- SaaS operations: subscription plans/features, business subscriptions, notification logs, platform settings.

All application tables declare RLS. The API is the application data boundary and must enforce ownership and role checks regardless of RLS.

## Safe schema rollout

1. Update the Drizzle schema and affected API contract/tests.
2. Back up the target database and verify its environment.
3. Review Drizzle's proposed SQL in staging first.
4. Apply with `pnpm --filter @workspace/db run push` only after approval.
5. Verify the deployed API, key workflows, and rollback plan.

The API does not run DDL or data migrations at startup. One-time data conversions are explicit commands documented in [DEVELOPMENT.md](DEVELOPMENT.md).

## Recovery

Follow [DATABASE_BACKUP_AND_RECOVERY.md](DATABASE_BACKUP_AND_RECOVERY.md) for backup retention, restore drills, and recovery. Do not store database dumps or credentials in Git.

## Known limits

List APIs are not yet paginated. Add pagination before directory, order, event, media, or admin datasets grow materially.
