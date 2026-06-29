#!/usr/bin/env node
/**
 * Dev-only: relink local DB user/business/admin records to a new Clerk user ID.
 */
import {
  diagnoseClerkRelink,
  formatRelinkDiagnosis,
  formatRelinkResult,
  formatRelinkScan,
  isDevClerkRelinkAllowed,
  relinkClerkUserByEmail,
  relinkClerkUserByPreviousId,
  scanClerkRelinkSituation,
} from "../src/lib/relink-clerk-user";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) {
    return process.argv[index + 1];
  }

  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function printUsage(): void {
  console.error(`Usage:
  relink-clerk-user --scan --clerk-user-id=user_xxx
  relink-clerk-user --email=you@example.com --clerk-user-id=user_xxx [--diagnose] [--dry-run]
  relink-clerk-user --from-clerk-user-id=user_OLD --clerk-user-id=user_NEW [--dry-run]

Notes:
  - Use --scan first if Clerk created a @user.local placeholder email.
  - --email must be your REAL admin email, not user_xxx@user.local.`);
}

async function main(): Promise<void> {
  if (!isDevClerkRelinkAllowed()) {
    console.error("Clerk relink is disabled when NODE_ENV=production.");
    process.exit(1);
  }

  const email = readArg("email");
  const clerkUserId = readArg("clerk-user-id");
  const fromClerkUserId = readArg("from-clerk-user-id");
  const dryRun = hasFlag("dry-run");
  const diagnoseOnly = hasFlag("diagnose");
  const scanOnly = hasFlag("scan");

  if (scanOnly) {
    if (!clerkUserId) {
      printUsage();
      process.exit(1);
    }
    const scan = await scanClerkRelinkSituation({ currentClerkUserId: clerkUserId });
    console.log(formatRelinkScan(scan));
    return;
  }

  if (fromClerkUserId && clerkUserId) {
    const result = await relinkClerkUserByPreviousId({
      previousClerkUserId: fromClerkUserId,
      newClerkUserId: clerkUserId,
      dryRun,
    });
    console.log(formatRelinkResult(result));
    return;
  }

  if (!email) {
    printUsage();
    process.exit(1);
  }

  if (diagnoseOnly || !clerkUserId) {
    const diagnosis = await diagnoseClerkRelink({
      email,
      currentClerkUserId: clerkUserId ?? null,
    });
    console.log(formatRelinkDiagnosis(diagnosis));
    const shouldFail =
      diagnosis.clerkIdMismatch ||
      !diagnosis.userMatchedByEmail ||
      diagnosis.emailLooksSynthetic ||
      diagnosis.userMatchedByEmail?.role === "CUSTOMER";
    process.exit(shouldFail ? 1 : 0);
  }

  const result = await relinkClerkUserByEmail({
    email,
    newClerkUserId: clerkUserId,
    dryRun,
  });

  console.log(formatRelinkResult(result));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
