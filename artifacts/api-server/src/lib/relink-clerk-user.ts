import { eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  businessesTable,
  businessApplicationsTable,
  mediaAssetsTable,
  type User,
} from "@workspace/db";
import {
  assertDevClerkRelinkAllowed,
  isDevClerkRelinkAllowed,
  pickHigherRole,
  summarizeUser,
  type ClerkRelinkDiagnosis,
  type ClerkRelinkResult,
  type ClerkRelinkScan,
  type BusinessSummary,
  isSyntheticClerkEmail,
  isMalformedClerkUserId,
} from "./relink-clerk-user-shared";

export type {
  ClerkRelinkDiagnosis,
  ClerkRelinkResult,
  ClerkUserSummary,
  BusinessSummary,
  UserRole,
} from "./relink-clerk-user-shared";

export {
  assertDevClerkRelinkAllowed,
  formatRelinkDiagnosis,
  formatRelinkResult,
  formatRelinkScan,
  isDevClerkRelinkAllowed,
  isSyntheticClerkEmail,
  pickHigherRole,
  summarizeUser,
} from "./relink-clerk-user-shared";

async function listBusinessesForOwner(ownerId: string): Promise<BusinessSummary[]> {
  const rows = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      slug: businessesTable.slug,
    })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, ownerId));

  return rows;
}

async function findUserByEmail(email: string): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${normalized}`);
  return user;
}

async function findUserById(userId: string): Promise<User | undefined> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user;
}

export async function scanClerkRelinkSituation(input: {
  currentClerkUserId?: string | null;
}): Promise<ClerkRelinkScan> {
  const currentClerkUserId = input.currentClerkUserId?.trim() || null;
  const currentSessionUser = currentClerkUserId
    ? await findUserById(currentClerkUserId)
    : undefined;

  const privilegedRows = await db
    .select()
    .from(usersTable)
    .where(sql`${usersTable.role} in ('ADMIN', 'BUSINESS_OWNER')`);

  const privilegedUsers = await Promise.all(
    privilegedRows.map(async (user) => ({
      ...summarizeUser(user),
      businesses: await listBusinessesForOwner(user.id),
    })),
  );

  const allBusinesses = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      slug: businessesTable.slug,
      ownerId: businessesTable.ownerId,
    })
    .from(businessesTable);

  const userIds = new Set(
    (await db.select({ id: usersTable.id }).from(usersTable)).map((row) => row.id),
  );

  const orphanedBusinesses = allBusinesses
    .filter((business) => business.ownerId && !userIds.has(business.ownerId))
    .map((business) => ({
      id: business.id,
      name: business.name,
      slug: business.slug,
      ownerId: business.ownerId,
    }));

  const likelyCanonicalUser =
    privilegedUsers.find(
      (user) =>
        user.id !== currentClerkUserId &&
        !isMalformedClerkUserId(user.id) &&
        (user.role === "ADMIN" || user.businesses.length > 0),
    ) ??
    privilegedUsers.find(
      (user) => user.id !== currentClerkUserId && isMalformedClerkUserId(user.id),
    ) ??
    privilegedUsers.find((user) => user.id !== currentClerkUserId) ??
    null;

  let recommendation = "No obvious relink target found.";
  if (!isDevClerkRelinkAllowed()) {
    recommendation = "Dev repair is disabled in production.";
  } else if (
    currentSessionUser &&
    (currentSessionUser.role === "ADMIN" || currentSessionUser.role === "BUSINESS_OWNER")
  ) {
    const owned = privilegedUsers.find((user) => user.id === currentClerkUserId)?.businesses ?? [];
    if (currentSessionUser.role === "ADMIN" || owned.length > 0) {
      recommendation = "Current Clerk user is linked with privileged access. No relink needed.";
    }
  } else if (likelyCanonicalUser && currentClerkUserId && likelyCanonicalUser.id !== currentClerkUserId) {
    recommendation = `Run: pnpm --filter @workspace/api-server run relink-clerk-user -- --from-clerk-user-id=${likelyCanonicalUser.id} --clerk-user-id=${currentClerkUserId}`;
    if (!isSyntheticClerkEmail(likelyCanonicalUser.email)) {
      recommendation += ` OR --email=${likelyCanonicalUser.email} --clerk-user-id=${currentClerkUserId}`;
    }
  } else if (
    currentSessionUser &&
    currentSessionUser.role === "CUSTOMER" &&
    privilegedUsers.some((user) => user.role === "ADMIN")
  ) {
    recommendation = "Current session is CUSTOMER but an ADMIN exists locally. Run with --scan and relink from the ADMIN row.";
  }

  return {
    devRepairAllowed: isDevClerkRelinkAllowed(),
    currentClerkUserId,
    currentSessionUser: currentSessionUser ? summarizeUser(currentSessionUser) : null,
    privilegedUsers,
    orphanedBusinesses,
    likelyCanonicalUser,
    recommendation,
  };
}

export async function diagnoseClerkRelink(input: {
  email: string;
  currentClerkUserId?: string | null;
}): Promise<ClerkRelinkDiagnosis> {
  const email = input.email.trim();
  const emailLooksSynthetic = isSyntheticClerkEmail(email);
  const userMatchedByEmail = await findUserByEmail(email);
  const userMatchedByClerkId = input.currentClerkUserId
    ? await findUserById(input.currentClerkUserId)
    : undefined;

  const businessesForEmailUser = userMatchedByEmail
    ? await listBusinessesForOwner(userMatchedByEmail.id)
    : [];
  const businessesForClerkUser = input.currentClerkUserId
    ? await listBusinessesForOwner(input.currentClerkUserId)
    : [];

  const clerkIdMismatch = Boolean(
    userMatchedByEmail &&
      input.currentClerkUserId &&
      userMatchedByEmail.id !== input.currentClerkUserId,
  );

  let recommendation = "No relink needed.";
  if (!isDevClerkRelinkAllowed()) {
    recommendation = "Dev repair is disabled in production.";
  } else if (emailLooksSynthetic) {
    recommendation =
      "This looks like an auto-created @user.local email, not your real admin account. Run with --scan --clerk-user-id=<your current id>.";
  } else if (!userMatchedByEmail) {
    recommendation = `No local user row found for email ${email}. Try --scan to list ADMIN/BUSINESS_OWNER rows.`;
  } else if (!input.currentClerkUserId) {
    recommendation = "Provide the current Clerk user ID (sign in or pass --clerk-user-id).";
  } else if (clerkIdMismatch) {
    recommendation =
      "Clerk user ID mismatch detected. Run relink with --email or --from-clerk-user-id.";
  } else if (
    userMatchedByEmail.role === "CUSTOMER" &&
    input.currentClerkUserId === userMatchedByEmail.id
  ) {
    recommendation =
      "Current Clerk user is only a CUSTOMER locally. Run --scan to find your ADMIN/BUSINESS_OWNER row to relink from.";
  } else if (businessesForEmailUser.length > 0 && businessesForClerkUser.length === 0) {
    recommendation =
      "User IDs match but businesses may still point to a stale owner ID — run --scan.";
  }

  return {
    devRepairAllowed: isDevClerkRelinkAllowed(),
    email,
    emailLooksSynthetic,
    currentClerkUserId: input.currentClerkUserId ?? null,
    userMatchedByClerkId: userMatchedByClerkId ? summarizeUser(userMatchedByClerkId) : null,
    userMatchedByEmail: userMatchedByEmail ? summarizeUser(userMatchedByEmail) : null,
    clerkIdMismatch,
    businessesForClerkUser,
    businessesForEmailUser,
    recommendation,
  };
}

export async function relinkClerkUserByEmail(input: {
  email: string;
  newClerkUserId: string;
  dryRun?: boolean;
}): Promise<ClerkRelinkResult> {
  const canonical = await findUserByEmail(input.email.trim());
  if (!canonical) {
    throw new Error(`No local user found for email: ${input.email}`);
  }

  return relinkClerkUserFromCanonical({
    canonical,
    newClerkUserId: input.newClerkUserId,
    dryRun: input.dryRun,
  });
}

export async function relinkClerkUserByPreviousId(input: {
  previousClerkUserId: string;
  newClerkUserId: string;
  dryRun?: boolean;
}): Promise<ClerkRelinkResult> {
  const canonical = await findUserById(input.previousClerkUserId.trim());
  if (!canonical) {
    throw new Error(`No local user found for Clerk user ID: ${input.previousClerkUserId}`);
  }

  return relinkClerkUserFromCanonical({
    canonical,
    newClerkUserId: input.newClerkUserId,
    dryRun: input.dryRun,
  });
}

async function relinkClerkUserFromCanonical(input: {
  canonical: User;
  newClerkUserId: string;
  dryRun?: boolean;
}): Promise<ClerkRelinkResult> {
  assertDevClerkRelinkAllowed();

  const canonical = input.canonical;
  const email = canonical.email;
  const newClerkUserId = input.newClerkUserId.trim();
  const dryRun = input.dryRun ?? false;
  const previousClerkUserId = canonical.id;
  if (previousClerkUserId === newClerkUserId) {
    const businesses = await listBusinessesForOwner(newClerkUserId);
    return {
      dryRun,
      email,
      previousClerkUserId,
      newClerkUserId,
      mergedOrphanUser: false,
      role: canonical.role,
      businessesRelinked: businesses,
      applicationsRelinked: 0,
      mediaAssetsRelinked: 0,
      applicationsReviewedByRelinked: 0,
      message: "User is already linked to this Clerk ID.",
    };
  }

  const [orphan] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, newClerkUserId));

  const businessesForOldOwner = await listBusinessesForOwner(previousClerkUserId);

  const [{ count: applicationCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businessApplicationsTable)
    .where(eq(businessApplicationsTable.userId, previousClerkUserId));

  const [{ count: reviewedByCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businessApplicationsTable)
    .where(eq(businessApplicationsTable.reviewedBy, previousClerkUserId));

  const [{ count: mediaCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.uploadedByUserId, previousClerkUserId));

  const mergedRole = orphan ? pickHigherRole(canonical.role, orphan.role) : canonical.role;

  if (dryRun) {
    return {
      dryRun: true,
      email,
      previousClerkUserId,
      newClerkUserId,
      mergedOrphanUser: Boolean(orphan),
      role: mergedRole,
      businessesRelinked: businessesForOldOwner,
      applicationsRelinked: applicationCount,
      mediaAssetsRelinked: mediaCount,
      applicationsReviewedByRelinked: reviewedByCount,
      message: "Dry run only — no database changes were made.",
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(businessesTable)
      .set({ ownerId: newClerkUserId })
      .where(eq(businessesTable.ownerId, previousClerkUserId));

    await tx
      .update(businessApplicationsTable)
      .set({ userId: newClerkUserId })
      .where(eq(businessApplicationsTable.userId, previousClerkUserId));

    await tx
      .update(businessApplicationsTable)
      .set({ reviewedBy: newClerkUserId })
      .where(eq(businessApplicationsTable.reviewedBy, previousClerkUserId));

    await tx
      .update(mediaAssetsTable)
      .set({ uploadedByUserId: newClerkUserId })
      .where(eq(mediaAssetsTable.uploadedByUserId, previousClerkUserId));

    if (orphan) {
      await tx.delete(usersTable).where(eq(usersTable.id, previousClerkUserId));

      await tx
        .update(usersTable)
        .set({
          email: canonical.email,
          name: canonical.name ?? orphan.name,
          role: mergedRole,
        })
        .where(eq(usersTable.id, newClerkUserId));
    } else {
      await tx
        .update(usersTable)
        .set({ id: newClerkUserId })
        .where(eq(usersTable.id, previousClerkUserId));
    }
  });

  const businessesRelinked = await listBusinessesForOwner(newClerkUserId);

  return {
    dryRun: false,
    email,
    previousClerkUserId,
    newClerkUserId,
    mergedOrphanUser: Boolean(orphan),
    role: mergedRole,
    businessesRelinked,
    applicationsRelinked: applicationCount,
    mediaAssetsRelinked: mediaCount,
    applicationsReviewedByRelinked: reviewedByCount,
    message: "Clerk user relink completed.",
  };
}
