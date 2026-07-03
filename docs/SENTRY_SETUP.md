# Sentry Setup (TownHub)

TownHub uses Sentry for error monitoring on both the API server and the React frontend. Tracing, performance monitoring, and profiling are disabled — only errors are captured.

## Projects

Create **two** Sentry projects (or one project with separate DSNs if you prefer):

| Surface | SDK | Env variable |
|---------|-----|--------------|
| API (`artifacts/api-server`) | `@sentry/node` | `SENTRY_DSN` |
| Frontend (`artifacts/local-order-hub`) | `@sentry/react` | `VITE_SENTRY_DSN` |

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

Test (temporary endpoint — remove after validation):

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
pnpm --filter @workspace/local-order-hub run dev
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

Initialization: `artifacts/local-order-hub/src/lib/sentry.ts`, imported first from `main.tsx`.

---

## What is not sent

Scrubbing is applied on the frontend before events leave the browser:

- Passwords, tokens, authorization headers, secrets
- Stripe-related fields
- Full request/response bodies on fetch breadcrumbs

Do not add PII or secrets to Sentry `extra` / `context` manually.

---

## Removing test endpoints

After verifying Sentry in each environment:

- API: remove `artifacts/api-server/src/routes/debug.ts` and its mount in `routes/index.ts`
- Frontend: remove `src/pages/debug-sentry.tsx` and the dev-only route in `App.tsx`
