import { eq } from "drizzle-orm";
import { db, businessesTable, usersTable, type subscriptionPlansTable } from "@workspace/db";
import {
  buildApplicationApprovedEmail,
  defaultApplicationApprovedEmailData,
} from "./email-templates/application-emails";
import { buildPlatformAdminSubscriptionEmail } from "./email-templates/subscription-admin-emails";
import type { PlatformAdminSubscriptionEvent } from "./email-templates/types";
import { deliverOwnerApplicationEmail, deliverPlatformAdminSubscriptionEmail } from "./notification-delivery";
import { resolveOwnerDeliverableEmail } from "./owner-email";
import { logger } from "./logger";
import {
  formatSubscriptionPriceLabel,
  subscriptionStatusLabel,
  type SubscriptionStateSnapshot,
} from "./subscription-notification-core";

type Plan = typeof subscriptionPlansTable.$inferSelect;

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

async function resolveApprovalRecipientEmail(input: {
  ownerId: string;
  ownerEmail?: string | null;
  businessId: number;
}): Promise<string | null> {
  const [business] = await db
    .select({
      notificationEmail: businessesTable.notificationEmail,
      orderNotificationEmail: businessesTable.orderNotificationEmail,
    })
    .from(businessesTable)
    .where(eq(businessesTable.id, input.businessId));

  return resolveOwnerDeliverableEmail({
    ownerId: input.ownerId,
    applicationEmail: input.ownerEmail,
    notificationEmail: business?.notificationEmail,
    orderNotificationEmail: business?.orderNotificationEmail,
    syncToUserRow: true,
  });
}

function mapApprovalToAdminEvent(
  snapshot: SubscriptionStateSnapshot,
  requiresCheckout: boolean,
): PlatformAdminSubscriptionEvent | null {
  if (requiresCheckout) return null;
  const status = snapshot.status;
  if (status === "TRIAL" || status === "TRIALING") return "ADMIN_TRIAL_STARTED";
  if (status === "ACTIVE" || status === "BETA") return "ADMIN_SUBSCRIPTION_PAID_STARTED";
  return null;
}

export async function notifyBusinessApplicationApproved(input: {
  businessId: number;
  businessName: string;
  ownerId: string;
  ownerEmail?: string | null;
  plan: Plan;
  billingInterval: "monthly" | "yearly";
  snapshot: SubscriptionStateSnapshot;
  requiresCheckout: boolean;
}): Promise<void> {
  const recipient = await resolveApprovalRecipientEmail({
    ownerId: input.ownerId,
    ownerEmail: input.ownerEmail,
    businessId: input.businessId,
  });

  if (!recipient) {
    logger.warn(
      { businessId: input.businessId, ownerId: input.ownerId },
      "Skipping application approved email — no owner email",
    );
    return;
  }

  const priceLabel = formatSubscriptionPriceLabel({
    monthlyPrice: parseFloat(input.plan.monthlyPrice),
    yearlyPrice: input.plan.yearlyPrice ? parseFloat(input.plan.yearlyPrice) : null,
    billingInterval: input.billingInterval,
  });

  const emailData = defaultApplicationApprovedEmailData({
    businessName: input.businessName,
    planName: input.plan.name,
    statusLabel: input.requiresCheckout
      ? "Pending checkout"
      : subscriptionStatusLabel(input.snapshot.status, input.snapshot.trialEndsAt),
    priceLabel,
    billingInterval: input.billingInterval,
    trialEndsAt: input.snapshot.trialEndsAt,
    requiresCheckout: input.requiresCheckout,
  });

  const content = buildApplicationApprovedEmail(emailData);

  await deliverOwnerApplicationEmail({
    businessId: input.businessId,
    eventType: "APPLICATION_APPROVED",
    to: recipient,
    subject: content.subject,
    body: content.text,
    html: content.html,
  });

  logger.info(
    { businessId: input.businessId, to: recipient, requiresCheckout: input.requiresCheckout },
    "Application approved email queued",
  );

  const adminEvent = mapApprovalToAdminEvent(input.snapshot, input.requiresCheckout);
  if (!adminEvent) return;

  const adminRecipients = await resolvePlatformAdminEmails();
  if (adminRecipients.length === 0) return;

  const adminContent = buildPlatformAdminSubscriptionEmail(adminEvent, {
    businessId: input.businessId,
    businessName: input.businessName,
    planName: input.plan.name,
    statusLabel: subscriptionStatusLabel(input.snapshot.status, input.snapshot.trialEndsAt),
    priceLabel,
    billingInterval: input.billingInterval,
    subscriptionUrl: emailData.subscriptionUrl,
    businessHubUrl: emailData.businessHubUrl,
    manageBillingUrl: emailData.subscriptionUrl,
    reactivateSubscriptionUrl: emailData.subscriptionUrl,
    helpCenterUrl: emailData.helpCenterUrl,
    welcomeVideoUrl: emailData.helpCenterUrl,
    businessOwnerTrainingUrl: emailData.businessOwnerTrainingUrl,
    customerTrainingUrl: emailData.helpCenterUrl,
  });

  for (const to of adminRecipients) {
    await deliverPlatformAdminSubscriptionEmail({
      businessId: input.businessId,
      eventType: adminEvent,
      to,
      subject: adminContent.subject,
      body: adminContent.text,
      html: adminContent.html,
    });
  }
}
