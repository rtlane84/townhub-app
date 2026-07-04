import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

/** Platform admin inboxes for operational alerts (env override, then ADMIN users). */
export async function resolvePlatformAdminEmails(): Promise<string[]> {
  const fromEnv =
    process.env.PLATFORM_ADMIN_EMAIL?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  if (fromEnv.length > 0) return fromEnv;

  const admins = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.role, "ADMIN"));

  return admins
    .map((row) => row.email?.trim())
    .filter((email): email is string => !!email && !email.endsWith("@user.local"));
}
