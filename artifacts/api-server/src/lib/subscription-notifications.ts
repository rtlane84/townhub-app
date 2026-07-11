import { and, eq } from "drizzle-orm";
import {
  db,
  businessesTable,
  businessSubscriptionsTable,
  notificationLogsTable,
  subscriptionPlansTable,
  usersTable,
} from "@workspace/db";
import { buildPlatformAdminSubscriptionEmail } from "./email-templates/subscription-admin-emails";
import { buildSubscriptionLifecycleEmail } from "./email-templates/subscription-emails";
import type {
  PlatformAdminSubscriptionEvent,
  SubscriptionNotificationData,
  SubscriptionNotificationEvent,
} from "./email-templates/types";
import {
  deliverOwnerSubscriptionEmail,
  deliverPlatformAdminSubscriptionEmail,
} from "./notification-delivery";
import {
  dashboardBusinessHubUrl,
  dashboardSubscriptionUrl,
  helpCenterBusinessOwnerTrainingUrl,
  helpCenterCustomerTrainingUrl,
  helpCenterUrl,
  helpCenterWelcomeVideoUrl,
} from "./notification-urls";
import { resolveOwnerDeliverableEmail } from "./owner-email";
import { logger } from "./logger";
import {
  calendarDaysUntil,
  detectSubscriptionNotificationEvents,
  mapOwnerEventToAdminEvent,
  formatSubscriptionPriceLabel,
  shouldDedupeSubscriptionEvent,
  shouldSkipTrialStartedEmail,
  snapshotFromSubscriptionRow,
  snapshotFromSyncInput,
  subscriptionAccessEndDate,
  subscriptionStatusLabel,
  type SubscriptionNotifySource,
  type SubscriptionStateSnapshot,
} from "./subscription-notification-core";
import type { SubscriptionSyncInput } from "./stripe-billing-core";

export {
  calendarDaysUntil,
  detectSubscriptionNotificationEvents,
  type SubscriptionNotifySource,
  type SubscriptionStateSnapshot,
} from "./subscription-notification-core";

const GRACE_PERIOD_NOTE =
  "TownHub keeps your subscription active while Stripe retries payment over the next several days. Update your payment method soon to avoid losing access to paid features.";

async function resolveOwnerEmailForSubscription(business: {
  notificationEmail?: string | null;
  orderNotificationEmail?: string | null;
  ownerId?: string | null;
}): Promise<string | null> {
  if (!business.ownerId) return null;

  return resolveOwnerDeliverableEmail({
    ownerId: business.ownerId,
    notificationEmail: business.notificationEmail,
    orderNotificationEmail: business.orderNotificationEmail,
    syncToUserRow: true,
  });
}

async function resolvePlatformAdminEmails(): Promise<string[]> {
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

async function resolveManageBillingUrl(businessId: number): Promise<string> {
  const { createCustomerPortalSession } = await import("./stripe-billing");
  const portal = await createCustomerPortalSession(businessId);
  if (portal.ok && portal.url && !portal.mockMode) {
    return portal.url;
  }
  return `${dashboardSubscriptionUrl()}?open=billing`;
}

async function wasSubscriptionNotificationSent(
  businessId: number,
  event: SubscriptionNotificationEvent | PlatformAdminSubscriptionEvent,
): Promise<boolean> {
  const [row] = await db
    .select({ id: notificationLogsTable.id })
    .from(notificationLogsTable)
    .where(
      and(
        eq(notificationLogsTable.businessId, businessId),
        eq(notificationLogsTable.eventType, event),
      ),
    )
    .limit(1);

  return !!row;
}

async function buildSubscriptionNotificationData(
  businessId: number,
  snapshot: SubscriptionStateSnapshot,
  options?: { amountCharged?: string | null },
): Promise<SubscriptionNotificationData | null> {
  const [business] = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      logoUrl: businessesTable.logoUrl,
      ownerId: businessesTable.ownerId,
      notificationEmail: businessesTable.notificationEmail,
      orderNotificationEmail: businessesTable.orderNotificationEmail,
    })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) return null;

  const [plan] = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.id, snapshot.planId));

  if (!plan) return null;

  const manageBillingUrl = await resolveManageBillingUrl(businessId);
  const accessEnd = subscriptionAccessEndDate(snapshot);
  const priceLabel = formatSubscriptionPriceLabel({
    monthlyPrice: parseFloat(plan.monthlyPrice),
    yearlyPrice: plan.yearlyPrice ? parseFloat(plan.yearlyPrice) : null,
    billingInterval: snapshot.billingInterval,
  });

  return {
    businessId,
    businessName: business.name,
    businessLogoUrl: business.logoUrl,
    planName: plan.name,
    statusLabel: subscriptionStatusLabel(snapshot.status, snapshot.trialEndsAt),
    trialEndsAt: snapshot.trialEndsAt,
    billingInterval: snapshot.billingInterval as "monthly" | "yearly" | null,
    priceLabel,
    amountCharged: options?.amountCharged ?? priceLabel,
    nextBillingDate: accessEnd,
    cancellationDate: snapshot.cancelAtPeriodEnd ? accessEnd : null,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    gracePeriodNote: GRACE_PERIOD_NOTE,
    subscriptionUrl: dashboardSubscriptionUrl(),
    businessHubUrl: dashboardBusinessHubUrl(),
    manageBillingUrl,
    reactivateSubscriptionUrl: dashboardSubscriptionUrl(),
    helpCenterUrl: helpCenterUrl(),
    welcomeVideoUrl: helpCenterWelcomeVideoUrl(),
    businessOwnerTrainingUrl: helpCenterBusinessOwnerTrainingUrl(),
    customerTrainingUrl: helpCenterCustomerTrainingUrl(),
  };
}

async function sendPlatformAdminNotification(
  businessId: number,
  adminEvent: PlatformAdminSubscriptionEvent,
  data: SubscriptionNotificationData,
  ownerEvent: SubscriptionNotificationEvent,
): Promise<void> {
  const shouldDedupeAdmin =
    ownerEvent !== "SUBSCRIPTION_ACTIVATED" &&
    (await wasSubscriptionNotificationSent(businessId, adminEvent));
  if (shouldDedupeAdmin) return;

  const recipients = await resolvePlatformAdminEmails();
  if (recipients.length === 0) {
    logger.warn({ businessId, adminEvent }, "Skipping admin subscription email — no admin recipients");
    return;
  }

  const content = buildPlatformAdminSubscriptionEmail(adminEvent, data);

  for (const to of recipients) {
    await deliverPlatformAdminSubscriptionEmail({
      businessId,
      eventType: adminEvent,
      to,
      subject: content.subject,
      body: content.text,
      html: content.html,
    });
  }
}

async function sendSubscriptionNotification(
  businessId: number,
  event: SubscriptionNotificationEvent,
  snapshot: SubscriptionStateSnapshot,
  options?: { trialDaysRemaining?: 7 | 1; amountCharged?: string | null },
): Promise<void> {
  if (shouldDedupeSubscriptionEvent(event)) {
    const alreadySent = await wasSubscriptionNotificationSent(businessId, event);
    if (alreadySent) return;
  }

  const [business] = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      ownerId: businessesTable.ownerId,
      notificationEmail: businessesTable.notificationEmail,
      orderNotificationEmail: businessesTable.orderNotificationEmail,
    })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) return;

  const recipient = await resolveOwnerEmailForSubscription(business);
  if (!recipient) {
    logger.warn({ businessId, event }, "Skipping subscription email — no owner email");
    return;
  }

  const data = await buildSubscriptionNotificationData(businessId, snapshot, {
    amountCharged: options?.amountCharged,
  });
  if (!data) return;

  const content = buildSubscriptionLifecycleEmail(event, data, options);

  await deliverOwnerSubscriptionEmail({
    businessId,
    eventType: event,
    to: recipient,
    subject: content.subject,
    body: content.text,
    html: content.html,
  });

  const adminEvent = mapOwnerEventToAdminEvent(event, snapshot);
  if (adminEvent) {
    await sendPlatformAdminNotification(businessId, adminEvent, data, event);
  }
}

export async function processSubscriptionNotifications(
  businessId: number,
  before: SubscriptionStateSnapshot | null,
  after: SubscriptionStateSnapshot,
  source: SubscriptionNotifySource,
): Promise<void> {
  const events = detectSubscriptionNotificationEvents(before, after, source);
  const welcomeInBatch = events.includes("SUBSCRIPTION_WELCOME");
  const welcomeAlreadySent = await wasSubscriptionNotificationSent(businessId, "SUBSCRIPTION_WELCOME");

  for (const event of events) {
    if (event === "SUBSCRIPTION_WELCOME" && welcomeAlreadySent) {
      continue;
    }
    if (
      shouldSkipTrialStartedEmail({
        event,
        source,
        welcomeInBatch,
        welcomeAlreadySent,
      })
    ) {
      continue;
    }

    const trialDaysRemaining =
      event === "SUBSCRIPTION_TRIAL_ENDING_7D"
        ? 7
        : event === "SUBSCRIPTION_TRIAL_ENDING_1D"
          ? 1
          : undefined;

    await sendSubscriptionNotification(businessId, event, after, {
      trialDaysRemaining: trialDaysRemaining as 7 | 1 | undefined,
    });
  }
}

export async function notifySubscriptionAfterUpsert(
  businessId: number,
  before: SubscriptionStateSnapshot | null,
  input: SubscriptionSyncInput,
  source: SubscriptionNotifySource,
): Promise<void> {
  const after = snapshotFromSyncInput(input);
  await processSubscriptionNotifications(businessId, before, after, source);
}

export async function notifySubscriptionAfterAdminAttach(
  businessId: number,
  after: SubscriptionStateSnapshot,
): Promise<void> {
  await processSubscriptionNotifications(businessId, null, after, { type: "admin_attach" });
}

export type TrialReminderJobResult = {
  scanned: number;
  sent7Day: number;
  sent1Day: number;
  skipped: number;
};

export async function runSubscriptionTrialReminderJob(now = new Date()): Promise<TrialReminderJobResult> {
  const rows = await db
    .select({
      businessId: businessSubscriptionsTable.businessId,
      status: businessSubscriptionsTable.status,
      planId: businessSubscriptionsTable.planId,
      cancelAtPeriodEnd: businessSubscriptionsTable.cancelAtPeriodEnd,
      trialEndsAt: businessSubscriptionsTable.trialEndsAt,
      currentPeriodEnd: businessSubscriptionsTable.currentPeriodEnd,
      renewalAt: businessSubscriptionsTable.renewalAt,
      billingInterval: businessSubscriptionsTable.billingInterval,
      stripeSubscriptionId: businessSubscriptionsTable.stripeSubscriptionId,
    })
    .from(businessSubscriptionsTable);

  let sent7Day = 0;
  let sent1Day = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.trialEndsAt || !["TRIAL", "TRIALING"].includes(row.status)) {
      skipped += 1;
      continue;
    }

    const daysRemaining = calendarDaysUntil(row.trialEndsAt, now);
    if (daysRemaining !== 7 && daysRemaining !== 1) {
      skipped += 1;
      continue;
    }

    const snapshot = snapshotFromSubscriptionRow(row);
    const event: SubscriptionNotificationEvent =
      daysRemaining === 7 ? "SUBSCRIPTION_TRIAL_ENDING_7D" : "SUBSCRIPTION_TRIAL_ENDING_1D";

    if (await wasSubscriptionNotificationSent(row.businessId, event)) {
      skipped += 1;
      continue;
    }

    await sendSubscriptionNotification(row.businessId, event, snapshot, {
      trialDaysRemaining: daysRemaining as 7 | 1,
    });

    if (daysRemaining === 7) sent7Day += 1;
    if (daysRemaining === 1) sent1Day += 1;
  }

  return {
    scanned: rows.length,
    sent7Day,
    sent1Day,
    skipped,
  };
}
