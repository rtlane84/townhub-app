# Reusable AI Workflows

Use these prompts from the repository root. Every prompt assumes the agent will inspect the dirty worktree and preserve unrelated changes.

## Audit a feature before editing

> Read the root `AGENTS.md` and every closer `AGENTS.md` that applies. Audit **[feature]** without changing files. Trace its UI, generated client/contract, API validation and authorization, business rules, database access, provider integrations, notifications/live events, tests, and docs. Compare code with documentation, identify security/tenancy/payment risks and contradictions, then report exact paths, current behavior, gaps, and the smallest safe change options. Mark unknowns explicitly.

## Implement a feature

> Read the root and closest applicable `AGENTS.md` files first. Implement **[feature and acceptance criteria]** as the smallest complete TownHub vertical slice. Treat current code and `lib/api-spec/openapi.yaml` as sources of truth, preserve one-business ownership boundaries, and enforce roles/feature gates server-side. Cover loading, empty, error, disabled, and success states. Update tests and operational docs. If the API shape changes, update OpenAPI and regenerate—never edit generated files. Run targeted checks first, then proportional package/E2E/build checks, and report exact results and unverified provider/device behavior.

## Fix a bug

> Read the root and closest applicable `AGENTS.md` files. Reproduce and diagnose **[bug]** before editing. Identify the broken invariant and affected customer/owner/admin paths; check auth, tenant scope, payment idempotency, notification side effects, native/web differences, and regression tests. Apply the narrowest root-cause fix without changing intended behavior. Add a failing-then-passing regression test, run targeted checks, inspect the final diff, and report the cause, fix, verification, and remaining uncertainty.

## Redesign UI without removing behavior

> Read the root and `artifacts/townhub/AGENTS.md`. Redesign **[screen/flow]** while preserving every current route, action, validation, permission, plan gate, loading/empty/error/disabled/success state, analytics hook, test selector, and web/Capacitor behavior unless an acceptance criterion explicitly changes it. Inventory behavior before editing. Reuse existing shadcn primitives, theme tokens, layouts, generated hooks, and navigation helpers. Verify keyboard use, mobile widths, safe areas, and meaningful visual states; update UI tests without weakening assertions.

## Review architecture and security

> Read the root and all applicable nested `AGENTS.md` files, `docs/ARCHITECTURE.md`, `SECURITY.md`, and relevant ADR/provider docs. Review **[area/change]** without implementing fixes. Trace trust boundaries from request/UI through authorization, business ownership, validation, database constraints, Stripe/provider calls, webhooks, logs, notifications, SSE, and guest links. Rank findings by exploitable impact and cite exact paths/lines. Distinguish confirmed defects, documentation drift, design debt, and unverified assumptions. Include missing negative/idempotency tests and a prioritized remediation plan.

## Add tests

> Read the root and closest applicable `AGENTS.md` files. Add tests for **[behavior]** using the repository's existing Node test or Playwright patterns. Cover the positive path plus relevant unauthenticated, wrong-role, wrong-business, inactive/archived, missing-feature, invalid guest-token, duplicate webhook/retry, and provider-failure cases. Do not alter production behavior merely to simplify tests or fabricate external services. Run the narrowest test command, then affected package typecheck; state which environment-dependent E2E/provider cases were skipped.

## Review changes before commit

> Read the root and closest applicable `AGENTS.md` files. Review the current diff only; do not commit, stage, push, or rewrite unrelated changes. Check acceptance criteria, accidental files, secrets/PII/tokens, generated-file edits, tenant and role enforcement, money units, Stripe domain separation, idempotency, notification failure isolation, web/Capacitor compatibility, tests, docs, and migration/rollout needs. Run `git diff --check` plus proportional existing verification commands. Report findings first by severity with exact paths, then command results, remaining risks, and recommended follow-ups.

## Verification command inventory

Run commands from the repository root.

```bash
# All TypeScript projects and artifact packages
pnpm run typecheck

# Package-specific type checking
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/townhub run typecheck

# Unit/API tests
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/townhub run test

# Playwright (requires local frontend/API; some workflows require Clerk/Stripe accounts)
pnpm run test:e2e
pnpm exec playwright test tests/e2e/smoke/public-pages.spec.ts

# Builds; root build runs typecheck first, then workspace builds where present
pnpm run build
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/townhub run build

# Contract generation after OpenAPI changes
pnpm --filter @workspace/api-spec run codegen

# Documentation/diff hygiene
git diff --check
```

There is no `lint` script or checked-in lint configuration. There is also no checked-in CI workflow under `.github/workflows`; `playwright.config.ts` has CI-aware settings, and `docs/PLAYWRIGHT_E2E.md` contains only an example job. Add lint and CI as separately reviewed follow-up work rather than inventing commands.
