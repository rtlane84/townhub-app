# Sentry Setup (TownHub)

TownHub uses Sentry for error monitoring on both the API server and the React frontend. Tracing, performance monitoring, and profiling are disabled — only errors are captured.

## Projects

Create **two** Sentry projects (or one project with separate DSNs if you prefer):

| Surface | SDK | Env variable |
|---------|-----|--------------|
| API (`artifacts/api-server`) | `@sentry/node` | `SENTRY_DSN` |
| Frontend (`artifacts/townhub`) | `@sentry/react` | `VITE_SENTRY_DSN` |

Copy each DSN from **Sentry → Project Settings → Client Keys (DSN)**.

---

## Local development

### API

Add to the repo root `.env`:

```bash
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
```

Optional release metadata (also shown in Admin → System Status):

```bash
APP_VERSION=1.0.0
GIT_COMMIT_SHA=abc1234
```

Start the API:

```bash
pnpm --filter @workspace/api-server run dev
```

Test (development-only endpoint — not mounted in production):

```bash
curl http://localhost:8080/api/debug/sentry
```

### Frontend

Add to the repo root `.env` (Vite reads `VITE_*` vars from the monorepo root when running dev):

```bash
VITE_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<frontend-project>
```

Optional:

```bash
VITE_APP_VERSION=1.0.0
VITE_GIT_COMMIT_SHA=abc1234
```

Start the frontend:

```bash
pnpm --filter @workspace/townhub run dev
```

Test in development only:

1. Open `http://localhost:23032/debug/sentry`
2. Confirm the error appears in Sentry
3. The global error boundary should show: *"Something went wrong. Please refresh the page or try again."*

When `VITE_SENTRY_DSN` is unset, the frontend runs normally and does not send events.

---

## Production (Replit)

Set secrets in **Replit → Secrets** (never commit DSNs):

| Secret | Required | Notes |
|--------|----------|-------|
| `SENTRY_DSN` | Optional | API error monitoring |
| `VITE_SENTRY_DSN` | Optional | Frontend error monitoring (build-time for Vite) |
| `APP_VERSION` | Optional | API release tag |
| `GIT_COMMIT_SHA` | Optional | API release tag |
| `VITE_APP_VERSION` | Optional | Frontend release tag |
| `VITE_GIT_COMMIT_SHA` | Optional | Frontend release tag |

`NODE_ENV` / `import.meta.env.MODE` are set automatically by the environment.

---

## What is captured

### API

- Unhandled Express errors (`Sentry.setupExpressErrorHandler`)
- Uncaught exceptions and unhandled promise rejections
- Request context via the Http integration (no performance tracing)

Initialization: `artifacts/api-server/src/instrument.ts`, loaded with `node --import ./dist/instrument.mjs` before the app starts.

### Frontend

- React render errors (global `ErrorBoundary`)
- Unhandled browser errors and unhandled promise rejections
- Safe context: Clerk user id, current route, selected business id (from dashboard localStorage)

Initialization: `artifacts/townhub/src/lib/sentry.ts`, imported first from `main.tsx`.

---

## What is not sent

Scrubbing is applied on both the API and frontend before events leave the process:

- Passwords, tokens, authorization headers, secrets, and Stripe-related fields
- Request cookies, headers, bodies, and query strings attached by default HTTP context
- Full request/response bodies on breadcrumbs
- User email/username (API keeps at most a stable user id when present)

Routine 4xx responses (validation failures, denied authorization) are returned by route handlers and do **not** go through `Sentry.setupExpressErrorHandler` unless an unexpected exception is thrown.

Do not add PII or secrets to Sentry `extra` / `context` manually.

Operations Center reports whether the API Sentry DSN env var is set (**Configured** / **Not configured**) without exposing the DSN value. Do not add a TownHub UI that reproduces the Sentry issue feed.

---

## Debug test endpoints

Sentry test routes are **development-only** and are not available in production:

| Endpoint | Availability |
|----------|--------------|
| `GET /api/debug/sentry` | Mounted when `NODE_ENV !== "production"` |
| `/debug/sentry` (frontend) | Registered only in Vite dev mode (`import.meta.env.DEV`) |

No action is required before production deploy — these routes are automatically excluded.
