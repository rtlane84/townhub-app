import { eq, inArray, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  businessesTable,
  businessApplicationsTable,
  mediaAssetsTable,
  type User,
} from "@workspace/db";
import { assertDevClerkRelinkAllowed } from "./relink-clerk-user-shared";

export type DevAccountAssignment = {
  clerkUserId: string;
  role: User["role"];
  email?: string;
  businessIds?: number[];
};

export type DevAccountSplitResult = {
  dryRun: boolean;
  assignments: DevAccountAssignment[];
  adminClerkUserId: string;
  platformMediaMoved: number;
  applicationReviewsMoved: number;
  message: string;
};

export async function assignDevClerkAccounts(input: {
  adminClerkUserId: string;
  assignments: DevAccountAssignment[];
  dryRun?: boolean;
}): Promise<DevAccountSplitResult> {
  assertDevClerkRelinkAllowed();

  const dryRun = input.dryRun ?? false;
  const adminClerkUserId = input.adminClerkUserId.trim();

  const [{ count: platformMediaCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mediaAssetsTable)
    .where(
      sql`${mediaAssetsTable.uploadedByUserId} != ${adminClerkUserId}
        AND (${mediaAssetsTable.businessId} IS NULL OR ${mediaAssetsTable.storedFilename} LIKE 'platform/%')`,
    );

  const nonAdminUploaderIds = input.assignments
    .map((a) => a.clerkUserId)
    .filter((id) => id !== adminClerkUserId);

  const [{ count: reviewsToMove }] =
    nonAdminUploaderIds.length > 0
      ? await db
          .select({ count: sql<number>`count(*)::int` })
          .from(businessApplicationsTable)
          .where(inArray(businessApplicationsTable.reviewedBy, nonAdminUploaderIds))
      : [{ count: 0 }];

  if (dryRun) {
    return {
      dryRun: true,
      assignments: input.assignments,
      adminClerkUserId,
      platformMediaMoved: platformMediaCount,
      applicationReviewsMoved: reviewsToMove,
      message: "Dry run only — no database changes were made.",
    };
  }

  await db.transaction(async (tx) => {
    for (const assignment of input.assignments) {
      const email =
        assignment.email?.trim() ||
        `${assignment.clerkUserId}@user.local`;

      const [existing] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, assignment.clerkUserId));

      if (existing) {
        await tx
          .update(usersTable)
          .set({ role: assignment.role, email })
          .where(eq(usersTable.id, assignment.clerkUserId));
      } else {
        await tx.insert(usersTable).values({
          id: assignment.clerkUserId,
          email,
          role: assignment.role,
        });
      }

      if (assignment.businessIds?.length) {
        await tx
          .update(businessesTable)
          .set({ ownerId: assignment.clerkUserId })
          .where(inArray(businessesTable.id, assignment.businessIds));
      }
    }

    if (nonAdminUploaderIds.length > 0) {
      await tx
        .update(businessApplicationsTable)
        .set({ reviewedBy: adminClerkUserId })
        .where(inArray(businessApplicationsTable.reviewedBy, nonAdminUploaderIds));

      await tx
        .update(mediaAssetsTable)
        .set({ uploadedByUserId: adminClerkUserId })
        .where(
          sql`${mediaAssetsTable.uploadedByUserId} in (${sql.join(
            nonAdminUploaderIds.map((id) => sql`${id}`),
            sql`, `,
          )}) AND (${mediaAssetsTable.businessId} IS NULL OR ${mediaAssetsTable.storedFilename} LIKE 'platform/%')`,
        );
    }
  });

  return {
    dryRun: false,
    assignments: input.assignments,
    adminClerkUserId,
    platformMediaMoved: platformMediaCount,
    applicationReviewsMoved: reviewsToMove,
    message: "Dev Clerk account roles reassigned.",
  };
}

export function formatDevAccountSplitResult(result: DevAccountSplitResult): string {
  const lines = [
    result.dryRun ? "=== Dev account split (dry run) ===" : "=== Dev account split complete ===",
    `Admin Clerk user ID: ${result.adminClerkUserId}`,
  ];

  for (const assignment of result.assignments) {
    const businesses =
      assignment.businessIds?.length ? ` businesses: #${assignment.businessIds.join(", #")}` : "";
    lines.push(`  - ${assignment.clerkUserId} → ${assignment.role}${businesses}`);
  }

  lines.push(
    `Platform media moved to admin: ${result.platformMediaMoved}`,
    `Application reviews moved to admin: ${result.applicationReviewsMoved}`,
    result.message,
  );

  return lines.join("\n");
}
