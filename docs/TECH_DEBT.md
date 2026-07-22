# Technical debt backlog

Living list of known scale, maintainability, and cleanup items. Not release blockers unless called out in [RELEASE_READINESS.md](RELEASE_READINESS.md).

## Must address before multi-instance API or second town

| ID | Item | Why |
|----|------|-----|
| DEBT-001 | Shared pub/sub for Business Hub SSE | In-process bus requires a **single API instance** today |
| DEBT-002 | Shared rate-limit store | In-memory limits are weak under multiple replicas |
| DEBT-003 | Multi-locality tenancy design | Branding-only today (`platform_settings`); second town needs an explicit architecture (see [adr/0005-clay-first-pilot-scope.md](adr/0005-clay-first-pilot-scope.md)) |
| DEBT-004 | Versioned schema migrations | Drizzle `push` only; painful for multi-dev / careful production rollouts |

## Should address as traffic and team grow

| ID | Item | Why |
|----|------|-----|
| DEBT-005 | Pagination on list endpoints | Full result sets do not scale |
| DEBT-006 | Retire startup `ensure-*` DDL | Compatibility debt; prefer reviewed schema push/rollout |
| DEBT-007 | Drop legacy v1 guest order tokens | Never expire; keep until notification links age out |
| DEBT-008 | Drop legacy `STRIPE_WEBHOOK_SECRET` fallback | Prefer Connect + platform secrets only |
| DEBT-009 | Retire legacy `product_option_*` tables | After confirming modifier-group migration is complete |
| DEBT-010 | Split mega routes (`orders.ts`, `businesses.ts`) | Maintainability |
| DEBT-011 | Remove legacy `REPLIT_*` / Replit host assumptions | Prefer Cloudflare + Railway only |
| DEBT-012 | Staff / multi-owner business roles | Today: single `ownerId` per business |

## Optional hygiene

| ID | Item |
|----|------|
| DEBT-013 | Stop tracking generated PDFs under `output/pdf/` |
| DEBT-014 | Prune unused Clerk framework skill packs under `.agents/skills` |
| DEBT-015 | Add `pnpm run lint` / expand CI to Playwright when stable |

Update this file when items are completed or when new durable debt is accepted.
