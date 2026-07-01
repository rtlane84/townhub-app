import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./logger";
import { resolveOwnerNotificationEmail } from "./owner-notification-settings";
import { emailFromSessionClaims, isDeliverableEmail } from "./owner-email-core";

export { emailFromSessionClaims, isDeliverableEmail } from "./owner-email-core";

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) return null;
  clerkClient ??= createClerkClient({ secretKey });
  return clerkClient;
}

export async function fetchClerkPrimaryEmail(userId: string): Promise<string | null> {
  const client = getClerkClient();
  if (!client) return null;

  try {
    const user = await client.users.getUser(userId);
    const primary =
      user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId) ??
      user.emailAddresses[0];
    const email = primary?.emailAddress ?? null;
    return isDeliverableEmail(email) ? email.trim() : null;
  } catch (err) {
    logger.warn({ err, userId }, "Failed to fetch Clerk user email");
    return null;
  }
}

export async function syncUserEmailIfNeeded(userId: string, email: string): Promise<void> {
  if (!isDeliverableEmail(email)) return;
  await db
    .update(usersTable)
    .set({ email: email.trim() })
    .where(eq(usersTable.id, userId));
}

export async function resolveOwnerDeliverableEmail(input: {
  ownerId: string;
  applicationEmail?: string | null;
  sessionClaims?: Record<string, unknown>;
  notificationEmail?: string | null;
  orderNotificationEmail?: string | null;
  syncToUserRow?: boolean;
}): Promise<string | null> {
  if (isDeliverableEmail(input.applicationEmail)) {
    const email = input.applicationEmail.trim();
    if (input.syncToUserRow) await syncUserEmailIfNeeded(input.ownerId, email);
    return email;
  }

  const configured = resolveOwnerNotificationEmail({
    notificationEmail: input.notificationEmail,
    orderNotificationEmail: input.orderNotificationEmail,
  });
  if (configured) return configured;

  const fromClaims = emailFromSessionClaims(input.sessionClaims);
  if (fromClaims) {
    if (input.syncToUserRow) await syncUserEmailIfNeeded(input.ownerId, fromClaims);
    return fromClaims;
  }

  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, input.ownerId));

  if (isDeliverableEmail(user?.email)) {
    return user.email.trim();
  }

  const fromClerk = await fetchClerkPrimaryEmail(input.ownerId);
  if (fromClerk) {
    if (input.syncToUserRow) await syncUserEmailIfNeeded(input.ownerId, fromClerk);
    return fromClerk;
  }

  return null;
}
