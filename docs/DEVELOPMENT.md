# Development

## Local setup

Use Node 24 and the pnpm version in the root `package.json`.

```bash
pnpm install
cp .env.example .env
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/townhub run dev
```

The frontend runs on `http://localhost:23032`; the API runs on `http://localhost:8080`.
Configure only local or explicitly approved staging credentials in `.env`. See [ENVIRONMENT.md](ENVIRONMENT.md).

## Safe daily workflow

1. Inspect the working tree before editing and preserve unrelated work.
2. For API changes, update `lib/api-spec/openapi.yaml`, run code generation, then update server and frontend callers.
3. For schema changes, update `lib/db/src/schema`, review the Drizzle output, back up non-local targets, and apply the schema deliberately. The API never changes schema at startup.
4. Add focused tests for behavior, authorization, and failures; then run the relevant package checks.

## Common commands

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/townhub run test
pnpm --filter @workspace/api-spec run codegen
pnpm run test:e2e
pnpm run build
```

Use `pnpm --filter @workspace/db run push` only against a verified target database. Never use `push-force` without an explicit destructive-change review.

## One-time legacy maintenance

After a backup and reviewed schema push, legacy business-type and product-option data can be converted explicitly:

```bash
CONFIRM_LEGACY_DATA_MIGRATION=1 \
pnpm --filter @workspace/api-server run migrate-legacy-data
```

Production additionally requires `ALLOW_LEGACY_DATA_MIGRATION=1`. This command is intentionally never run by the API server.

## Help

Use [TESTING.md](TESTING.md) for test prerequisites, [DATABASE.md](DATABASE.md) for schema/rollback guidance, and [IOS_APP.md](IOS_APP.md) for native work.
