import { eq, sql } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import {
  emailFromSessionClaims,
  fetchClerkPrimaryEmail,
  resolveOwnerDeliverableEmail,
} from "./owner-email";
import { isSyntheticClerkEmail } from "./relink-clerk-user-shared";
import { isPostgresUniqueViolation } from "./postgres-error";

export class ClerkUserDesyncError extends Error {
  constructor() {
    super("Clerk user identity does not match the linked TownHub account.");
    this.name = "ClerkUserDesyncError";
  }
}

function sessionClaimsEmail(
  claims: Record<string, unknown> | undefined,
  userId: string,
): string {
  return emailFromSessionClaims(claims) ?? `${userId}@user.local`;
}

async function upgradeSyntheticUserEmail(
  user: User,
  sessionClaims?: Record<string, unknown>,
): Promise<User> {
  if (!isSyntheticClerkEmail(user.email)) return user;

  const upgraded =
    emailFromSessionClaims(sessionClaims) ?? (await fetchClerkPrimaryEmail(user.id));
  if (!upgraded) return user;

  const [updated] = await db
    .update(usersTable)
    .set({ email: upgraded })
    .where(eq(usersTable.id, user.id))
    .returning();

  return updated ?? user;
}

export async function ensureDbUserForClerkSession(input: {
  userId: string;
  sessionClaims?: Record<string, unknown>;
  defaultRole?: User["role"];
}): Promise<User> {
  const { userId, sessionClaims, defaultRole = "CUSTOMER" } = input;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (existing) {
    return upgradeSyntheticUserEmail(existing, sessionClaims);
  }

  const email =
    (await resolveOwnerDeliverableEmail({ ownerId: userId, sessionClaims })) ??
    sessionClaimsEmail(sessionClaims, userId);
  const name = (sessionClaims?.name as string) ?? null;

  try {
    const [created] = await db
      .insert(usersTable)
      .values({ id: userId, email, name, role: defaultRole })
      .returning();
    return created;
  } catch (err) {
    if (!isPostgresUniqueViolation(err)) throw err;

    const [byEmail] = await db
      .select()
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${email.trim().toLowerCase()}`);

    if (byEmail && byEmail.id !== userId) {
      // Always surface as a typed conflict so /auth/me returns 409 (not a
      // opaque 500). Production clients hide nav until role is resolved.
      throw new ClerkUserDesyncError();
    }

    const [raceWinner] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (raceWinner) return raceWinner;

    throw err;
  }
}
