# Database Guidance

These instructions refine the root `AGENTS.md` for `lib/db`.

- Define tables, enums, relations, indexes, and constraints in `src/schema` and export them through `src/schema/index.ts` and `src/index.ts` as established. Preserve business ownership and customer/order history.
- Monetary product/order fields use decimal dollar values unless an existing field explicitly says cents (for example refund and pending-checkout aggregate fields). Follow the field's established unit; never infer from its TypeScript number type.
- Payment/webhook/retryable state needs database-backed uniqueness and auditability. Preserve unique Stripe session/event/idempotency constraints and transactional order materialization.
- Plan required-column additions for existing rows with safe defaults or a documented backfill. Describe rollout, rollback, and compatibility for production data.
- The only package scripts are `push` and `push-force`; there is no checked-in migration generation/application workflow. Do not claim otherwise. Never run either script against an unknown or non-local database without explicit authorization, and never use `push-force` unless specifically requested with destructive risk understood.
- Existing API startup `ensure-*` DDL is compatibility debt. Do not add new runtime schema mutation as a substitute for a reviewed schema rollout.
- For a schema/query change, run root library and API typechecks plus targeted tests. Provide an explicit migration/push plan; do not generate or apply database changes as part of unrelated work.
