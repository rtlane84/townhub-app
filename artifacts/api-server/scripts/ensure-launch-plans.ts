#!/usr/bin/env node
/**
 * Idempotently ensure Clay launch subscription plans exist:
 * - Business Showcase — $20/mo / $200/yr, 14-day trial (no online ordering)
 * - Business Ordering — $40/mo / $400/yr, 14-day trial (recommended)
 *
 * Usage (from repo root, against a local or explicitly authorized database):
 *   pnpm --filter @workspace/api-server exec tsx scripts/ensure-launch-plans.ts
 *
 * After running, paste Stripe Product/Price IDs into Admin → Plans for paid checkout.
 */
import { ensureLaunchSubscriptionPlans } from "../src/lib/ensure-launch-subscription-plans";

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LAUNCH_PLAN_SEED !== "1") {
    console.error(
      "Refusing to seed plans when NODE_ENV=production without ALLOW_LAUNCH_PLAN_SEED=1.",
    );
    process.exit(1);
  }

  const result = await ensureLaunchSubscriptionPlans();
  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
        nextStep:
          "Admin → Plans: attach Stripe product/price IDs for Business Showcase and Business Ordering, then verify /list-your-business#plans",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
