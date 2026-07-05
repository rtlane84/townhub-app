# TownHub — Database Operations

Operational notes for schema changes and database connectivity.

---

## Schema changes (Drizzle push)

TownHub uses a push-based Drizzle workflow (no migration files in repo).

```bash
pnpm --filter @workspace/db run push
```

### Before confirming a push

1. **Read the full SQL preview** Drizzle prints in the terminal.
2. **Reject destructive changes** unless you explicitly intend them:
   - `DROP TABLE` / `DROP COLUMN`
   - Enum value removals or renames
   - Type changes that rewrite columns
3. If you only expected additive changes (new indexes, new nullable columns), but Drizzle shows drops, **stop** and compare `lib/db/src/schema/` against the live database.
4. Use `push-force` **only in local development** when you understand the impact.

See also [docs/SETUP.md](SETUP.md) and [PRODUCTION.md](../PRODUCTION.md).

---

## Connection pool

The API (`@workspace/db`) uses `node-pg` with configurable pool settings. Defaults are suitable for local dev and a small beta deployment.

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_POOL_MAX` | `10` | Maximum pooled connections per API process |
| `DATABASE_CONNECTION_TIMEOUT_MS` | `10000` | Time to wait when acquiring a connection |
| `DATABASE_IDLE_TIMEOUT_MS` | `30000` | How long idle clients stay open |
| `DATABASE_QUERY_TIMEOUT_MS` | `30000` | Sets PostgreSQL `statement_timeout` on each new connection (`0` = disabled) |

### Production guidance

- Use an external pooler (PgBouncer, Neon, Supabase) when running multiple API instances.
- Set `DATABASE_POOL_MAX` conservatively so `(instances × pool max) + admin overhead` stays below PostgreSQL `max_connections`.
- Pool errors are logged as `[db] Unexpected idle client error on pool` or `[db] Failed to set statement_timeout on new connection`.

---

## Performance indexes

Secondary indexes for hot query paths live in `lib/db/src/schema/` via Drizzle `index()` definitions. After adding indexes, run `pnpm --filter @workspace/db run push` and confirm only `CREATE INDEX` statements appear.

---

## Related

- [PRODUCTION.md](../PRODUCTION.md) — production checklist
- [docs/PRODUCTION_MONITORING.md](PRODUCTION_MONITORING.md) — health and monitoring
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) — data layer overview
