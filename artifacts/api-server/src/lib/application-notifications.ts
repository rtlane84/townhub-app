import { eq } from "drizzle-orm";
import { db, businessesTable, subscriptionPlansTable } from "@workspace/db";
import {
  buildApplicationApprovedEmail,
  buildApplicationRejectedEmail,
  buildApplicationSubmittedAdminEmail,
  defaultApplicationApprovedEmailData,
  defaultApplicationRejectedEmailData,
} from "./email-templates/application-emails";
import { buildPlatformAdminSubscriptionEmail } from "./email-templates/subscription-admin-emails";
import type { PlatformAdminSubscriptionEvent } from "./email-templates/types";
import {
  deliverOwnerApplicationEmail,
  deliverPlatformAdminApplicationEmail,
  deliverPlatformAdminSubscriptionEmail,
} from "./notification-delivery";
import { dashboardAdminApplicationsUrl } from "./notification-urls";
import { resolvePlatformAdminEmails, resolvePlatformAdminUserIds } from "./platform-admin-recipients";
import { resolveOwnerDeliverableEmail } from "./owner-email";
import { logger } from "./logger";
import { deliverPushToUsers } from "./push-delivery";
import { buildAdminApplicationPush } from "./notification-push-copy";
import {
  formatSubscriptionPriceLabel,
  subscriptionStatusLabel,
  type SubscriptionStateSnapshot,
} from "./subscription-notification-core";
import { formatBusinessTypeLabel } from "@workspace/api-zod";

type Plan = typeof subscriptionPlansTable.$inferSelect;

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

export async function notifyBusinessApplicationSubmitted(input: {
  applicationId: number;
  businessName: string;
  businessType: string;
  applicantEmail: string | null;
  planId: number | null;
  billingInterval: "monthly" | "yearly" | null;
  description: string | null;
  address: string | null;
  phone: string | null;
}): Promise<void> {
  const adminRecipients = await resolvePlatformAdminEmails();
  const adminUserIds = await resolvePlatformAdminUserIds();

  if (adminRecipients.length === 0 && adminUserIds.length === 0) {
    logger.warn(
      { applicationId: input.applicationId },
      "Skipping application submitted admin notification — no admin recipients",
    );
    return;
  }

  let planName: string | null = null;
  if (input.planId) {
    const [plan] = await db
      .select({ name: subscriptionPlansTable.name })
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, input.planId));
    planName = plan?.name ?? null;
  }

  const content = buildApplicationSubmittedAdminEmail({
    applicationId: input.applicationId,
    businessName: input.businessName,
    businessTypeLabel: formatBusinessTypeLabel(input.businessType),
    applicantEmail: input.applicantEmail,
    planName,
    billingInterval: input.billingInterval,
    description: input.description,
    address: input.address,
    phone: input.phone,
    reviewApplicationsUrl: dashboardAdminApplicationsUrl(),
  });

  for (const to of adminRecipients) {
    await deliverPlatformAdminApplicationEmail({
      applicationId: input.applicationId,
      eventType: "ADMIN_APPLICATION_SUBMITTED",
      to,
      subject: content.subject,
      body: content.text,
      html: content.html,
    });
  }

  if (adminUserIds.length > 0) {
    const push = buildAdminApplicationPush({
      businessName: input.businessName,
      applicationId: input.applicationId,
    });
    await deliverPushToUsers({
      userIds: adminUserIds,
      businessId: 0,
      eventType: "ADMIN_APPLICATION_SUBMITTED",
      title: push.title,
      body: push.body,
      deepLink: push.deepLink,
    });
  }

  logger.info(
    {
      applicationId: input.applicationId,
      recipientCount: adminRecipients.length,
      pushRecipientCount: adminUserIds.length,
    },
    "Application submitted admin notification queued",
  );
}

export async function notifyBusinessApplicationRejected(input: {
  applicationId: number;
  ownerId: string;
  ownerEmail: string | null;
  businessName: string;
  reviewNote: string | null;
}): Promise<void> {
  const recipient = await resolveOwnerDeliverableEmail({
    ownerId: input.ownerId,
    applicationEmail: input.ownerEmail,
    syncToUserRow: true,
  });

  if (!recipient) {
    logger.warn(
      { applicationId: input.applicationId, ownerId: input.ownerId },
      "Skipping application rejected email — no owner email",
    );
    return;
  }

  const content = buildApplicationRejectedEmail(
    defaultApplicationRejectedEmailData({
      businessName: input.businessName,
      reviewNote: input.reviewNote,
    }),
  );

  await deliverOwnerApplicationEmail({
    businessId: 0,
    eventType: "APPLICATION_REJECTED",
    to: recipient,
    subject: content.subject,
    body: content.text,
    html: content.html,
  });

  logger.info(
    { applicationId: input.applicationId, to: recipient },
    "Application rejected email queued",
  );
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
