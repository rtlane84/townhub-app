import { db, stripeWebhookEventsTable } from "@workspace/db";
import { isPostgresUniqueViolation } from "./business-slug";

/** Returns true when this event id is new and should be processed. */
export async function claimStripeWebhookEvent(eventId: string): Promise<boolean> {
  try {
    await db.insert(stripeWebhookEventsTable).values({ eventId });
    return true;
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      return false;
    }
    throw err;
  }
}
