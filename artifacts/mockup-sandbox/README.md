# Mockup sandbox (not production)

Isolated Vite workspace for UI prototyping with shadcn primitives. It is **not** the TownHub production app and must not be treated as a source of product behavior.

- Production frontend: `artifacts/townhub`
- This package is excluded from the default root `pnpm run typecheck` filter
- To typecheck intentionally: `pnpm --filter @workspace/mockup-sandbox run typecheck`
