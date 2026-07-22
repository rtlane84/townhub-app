# TownHub

TownHub is a Clay-first local marketplace SaaS. Customers discover businesses, place orders, request appointments, and follow community activity. Business owners run storefront operations; admins manage the platform.

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/townhub run dev
```

The frontend runs on `http://localhost:23032`; the API runs on `http://localhost:8080`.

## Common commands

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/townhub run test
pnpm --filter @workspace/api-spec run codegen
pnpm run test:e2e
pnpm run build
```

## Documentation

| Document | Purpose |
| --- | --- |
| [PRODUCT.md](docs/PRODUCT.md) | Current product scope, roles, rules, and limits |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Safe local setup and engineering workflow |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md) | Variables and secret-handling rules |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Systems and major boundaries |
| [API.md](docs/API.md) | OpenAPI contract and API conventions |
| [DATABASE.md](docs/DATABASE.md) | Schema, rollout, recovery, and limits |
| [TESTING.md](docs/TESTING.md) | Test commands and E2E prerequisites |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Staging/production releases and rollback |
| [OPERATIONS.md](docs/OPERATIONS.md) | Monitoring, jobs, alerts, and recovery links |
| [SECURITY.md](SECURITY.md) | Auth, payments, authorization, and security rules |
| [history/](docs/history/) | Dated release and launch records |

## Repository layout

```text
artifacts/api-server  Express API
artifacts/townhub     React/Vite and Capacitor app
lib/api-spec          OpenAPI contract
lib/api-client-react  Generated React Query client
lib/api-zod           Shared/generated Zod schemas
lib/db                Drizzle schema and database access
tests/e2e             Playwright workflows
```

Known beta limits: browser-local carts, unpaginated lists, single-instance SSE, and no locality-isolated multi-town architecture.
