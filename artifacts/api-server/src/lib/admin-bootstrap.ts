import { db, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { isSetupCompleteFromAdminCount } from "./admin-bootstrap-logic";

export { isSetupCompleteFromAdminCount } from "./admin-bootstrap-logic";

export async function countAdminUsers(): Promise<number> {
  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "ADMIN"));

  return Number(adminCount);
}

export async function isAdminBootstrapComplete(): Promise<boolean> {
  return isSetupCompleteFromAdminCount(await countAdminUsers());
}
