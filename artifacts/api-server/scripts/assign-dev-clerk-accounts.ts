#!/usr/bin/env node
/**
 * Dev-only: assign roles/businesses to specific Clerk user IDs without merging accounts.
 *
 * Default mapping restores Ronald's local setup:
 * - user_3FanH1LUiXhYsqmzJQRtq8VikvE = ADMIN
 * - user_3FZKozUJTQBgBtkCDmVKOz3wZrp = BUSINESS_OWNER for Clay Diner (#1)
 */
import {
  assignDevClerkAccounts,
  formatDevAccountSplitResult,
} from "../src/lib/assign-dev-clerk-accounts";
import { isDevClerkRelinkAllowed } from "../src/lib/relink-clerk-user-shared";

const DEFAULT_ADMIN = "user_3FanH1LUiXhYsqmzJQRtq8VikvE";
const DEFAULT_DINER = "user_3FZKozUJTQBgBtkCDmVKOz3wZrp";

async function main(): Promise<void> {
  if (!isDevClerkRelinkAllowed()) {
    console.error("Disabled when NODE_ENV=production.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const adminId = process.env.ADMIN_CLERK_USER_ID?.trim() || DEFAULT_ADMIN;
  const dinerId = process.env.DINER_CLERK_USER_ID?.trim() || DEFAULT_DINER;

  const result = await assignDevClerkAccounts({
    adminClerkUserId: adminId,
    dryRun,
    assignments: [
      { clerkUserId: adminId, role: "ADMIN" },
      { clerkUserId: dinerId, role: "BUSINESS_OWNER", businessIds: [1] },
    ],
  });

  console.log(formatDevAccountSplitResult(result));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
