import { db, usersTable } from "@workspace/db";
import { and, count, eq } from "drizzle-orm";

export async function countActiveAdmins(): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(usersTable)
    .where(and(eq(usersTable.role, "ADMIN"), eq(usersTable.status, "ACTIVE")));

  return Number(value);
}
