import { eq, sql } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { isDevClerkRelinkAllowed } from "./relink-clerk-user-shared";

export class ClerkUserDesyncError extends Error {
  readonly currentClerkUserId: string;
  readonly localUserId: string;
  readonly email: string;
  readonly relinkCommand: string;

  constructor(currentClerkUserId: string, localUser: Pick<User, "id" | "email">) {
    const relinkCommand =
      `pnpm --filter @workspace/api-server run relink-clerk-user -- ` +
      `--from-clerk-user-id=${localUser.id} --clerk-user-id=${currentClerkUserId}`;
    super(
      `Clerk user ID ${currentClerkUserId} does not match local user ${localUser.id}. ` +
        `Run: ${relinkCommand}`,
    );
    this.name = "ClerkUserDesyncError";
    this.currentClerkUserId = currentClerkUserId;
    this.localUserId = localUser.id;
    this.email = localUser.email;
    this.relinkCommand = relinkCommand;
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "23505";
}

function sessionClaimsEmail(
  claims: Record<string, unknown> | undefined,
  userId: string,
): string {
  return (claims?.email as string) ?? `${userId}@user.local`;
}

export async function ensureDbUserForClerkSession(input: {
  userId: string;
  sessionClaims?: Record<string, unknown>;
  defaultRole?: User["role"];
}): Promise<User> {
  const { userId, sessionClaims, defaultRole = "CUSTOMER" } = input;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (existing) return existing;

  const email = sessionClaimsEmail(sessionClaims, userId);
  const name = (sessionClaims?.name as string) ?? null;

  try {
    const [created] = await db
      .insert(usersTable)
      .values({ id: userId, email, name, role: defaultRole })
      .returning();
    return created;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;

    const [byEmail] = await db
      .select()
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${email.trim().toLowerCase()}`);

    if (byEmail && byEmail.id !== userId) {
      if (isDevClerkRelinkAllowed()) {
        throw new ClerkUserDesyncError(userId, byEmail);
      }
      throw new Error("Account email is already linked to a different user ID.");
    }

    const [raceWinner] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (raceWinner) return raceWinner;

    throw err;
  }
}
