import {
  dashboardBusinessHubUrl,
  dashboardSubscriptionUrl,
  helpCenterBusinessOwnerTrainingUrl,
  helpCenterCustomerTrainingUrl,
  helpCenterUrl,
  helpCenterWelcomeVideoUrl,
} from "../notification-urls";
import {
  formatOrderDateTime,
  renderDetailTable,
  renderStatusBadge,
} from "./components";
import { renderEmailLayout, renderParagraph, renderMutedParagraph, escapeHtml } from "./layout";
import {
  onboardingNextStepsPlainText,
  onboardingSecondaryLinks,
  renderOnboardingNextStepsSection,
  SUBSCRIPTION_STARTED_NEXT_STEPS,
} from "./onboarding-email-sections";
import type { EmailContent, SubscriptionNotificationData, SubscriptionNotificationEvent } from "./types";

const GRACE_PERIOD_NOTE =
  "TownHub keeps your subscription active while Stripe retries payment over the next several days. Update your payment method soon to avoid losing access to paid features.";

function formatSubscriptionDate(value?: Date | string | null): string {
  if (!value) return "—";
  return formatOrderDateTime(value);
}

function formatBillingInterval(interval?: "monthly" | "yearly" | null): string {
  if (interval === "yearly") return "Yearly";
  if (interval === "monthly") return "Monthly";
  return "Not set";
}

function renderSubscriptionStartedNextStepsSection(): string {
  return renderOnboardingNextStepsSection(SUBSCRIPTION_STARTED_NEXT_STEPS);
}

function subscriptionOnboardingSecondaryActions(data: SubscriptionNotificationData) {
  return onboardingSecondaryLinks({
    businessOwnerTrainingUrl: data.businessOwnerTrainingUrl,
    helpCenterUrl: data.helpCenterUrl,
  });
}

function subscriptionDetailRows(
  data: SubscriptionNotificationData,
  options?: { includeTrialEnd?: boolean; includeAmount?: boolean; includeCancellationDate?: boolean },
) {
  const rows = [
    { label: "Business", value: data.businessName },
    { label: "Plan", value: data.planName },
    { label: "Status", value: data.statusLabel },
  ];

  if (options?.includeTrialEnd !== false && data.trialEndsAt) {
    rows.push({ label: "Trial ends", value: formatSubscriptionDate(data.trialEndsAt) });
  }

  rows.push(
    { label: "Billing", value: formatBillingInterval(data.billingInterval) },
    { label: "Price", value: data.priceLabel },
  );

  if (options?.includeAmount && data.amountCharged) {
    rows.push({ label: "Amount charged", value: data.amountCharged });
  }

  if (options?.includeCancellationDate && data.cancellationDate) {
    rows.push({ label: "Cancellation date", value: formatSubscriptionDate(data.cancellationDate) });
  }

  if (data.nextBillingDate) {
    rows.push({ label: "Next billing date", value: formatSubscriptionDate(data.nextBillingDate) });
  }

  return rows;
}

type SubscriptionEmailConfig = {
  subject: string;
  preheader: string;
  heading: string;
  introHtml: string;
  badge?: { label: string; tone: "neutral" | "success" | "warning" | "danger" };
  includeNextSteps?: boolean;
  includeDetails?: boolean;
  detailOptions?: { includeTrialEnd?: boolean; includeAmount?: boolean; includeCancellationDate?: boolean };
  footerNote?: string;
  actionLabel?: string;
  actionUrl?: string;
  secondaryActionLabel?: string;
  secondaryActionUrl?: string;
  secondaryActions?: Array<{ label: string; url: string }>;
  hideSecondaryAction?: boolean;
  primaryButtonVariant?: "default" | "large";
};

function buildSubscriptionEmail(data: SubscriptionNotificationData, config: SubscriptionEmailConfig): EmailContent {
  const subscriptionUrl = data.subscriptionUrl || dashboardSubscriptionUrl();
  const businessHubUrl = data.businessHubUrl || dashboardBusinessHubUrl();
  const manageBillingUrl = data.manageBillingUrl || subscriptionUrl;

  const parts = [
    config.badge
      ? `<div style="text-align:center;margin-bottom:20px;">${renderStatusBadge(config.badge.label, config.badge.tone)}</div>`
      : "",
    config.introHtml,
    config.includeDetails !== false ? renderDetailTable(subscriptionDetailRows(data, config.detailOptions)) : "",
    config.includeNextSteps ? renderSubscriptionStartedNextStepsSection() : "",
  ].filter(Boolean);

  const actionLabel = config.actionLabel ?? "Open Subscription";
  const actionUrl = config.actionUrl ?? subscriptionUrl;
  const showSecondary = !config.hideSecondaryAction;
  const secondaryActions =
    config.secondaryActions ??
    (showSecondary && config.secondaryActionLabel && config.secondaryActionUrl
      ? [{ label: config.secondaryActionLabel, url: config.secondaryActionUrl }]
      : showSecondary && !config.secondaryActionLabel
        ? [{ label: "Manage Billing", url: manageBillingUrl }]
        : []);

  const html = renderEmailLayout({
    preheader: config.preheader,
    businessName: data.businessName,
    businessLogoUrl: data.businessLogoUrl,
    heading: config.heading,
    bodyHtml: parts.join(""),
    actionLabel,
    actionUrl,
    secondaryActions: secondaryActions.length > 0 ? secondaryActions : undefined,
    primaryButtonVariant: config.primaryButtonVariant,
    footerNote: config.footerNote,
  });

  const detailLines = subscriptionDetailRows(data, config.detailOptions)
    .map((row) => `${row.label}: ${row.value}`)
    .join("\n");

  const text = [
    config.heading,
    "",
    config.preheader,
    "",
    detailLines,
    "",
    config.includeNextSteps ? onboardingNextStepsPlainText(SUBSCRIPTION_STARTED_NEXT_STEPS) : "",
    "",
    `${actionLabel}: ${actionUrl}`,
    ...secondaryActions.map((link) => `${link.label}: ${link.url}`),
    config.footerNote ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: config.subject, text, html };
}

export function buildSubscriptionWelcomeEmail(data: SubscriptionNotificationData): EmailContent {
  const isTrial = data.statusLabel.toLowerCase().includes("trial");
  return buildSubscriptionEmail(data, {
    subject: `Welcome to TownHub — ${data.planName} plan`,
    preheader: `Your ${data.planName} subscription for ${data.businessName} is ready.`,
    heading: "Welcome to TownHub",
    badge: { label: isTrial ? "Trial" : "Active", tone: isTrial ? "warning" : "success" },
    introHtml: [
      renderParagraph(`Hi there,`),
      renderParagraph(
        `Thanks for subscribing <strong>${data.businessName}</strong> to TownHub on the <strong>${data.planName}</strong> plan.`,
      ),
      isTrial
        ? renderParagraph(
            `Your free trial is active${data.trialEndsAt ? ` through <strong>${formatSubscriptionDate(data.trialEndsAt)}</strong>` : ""}.`,
          )
        : renderParagraph(`Your subscription is active and ready to use.`),
      renderMutedParagraph(
        "TownHub sends onboarding and account updates like this one. Stripe continues to send official payment receipts and invoices separately.",
      ),
    ].join(""),
    includeNextSteps: true,
    actionLabel: "Open Business Hub",
    actionUrl: data.businessHubUrl,
    secondaryActions: subscriptionOnboardingSecondaryActions(data),
  });
}

export function buildSubscriptionTrialStartedEmail(data: SubscriptionNotificationData): EmailContent {
  return buildSubscriptionEmail(data, {
    subject: `Your TownHub trial has started — ${data.planName}`,
    preheader: `Your ${data.planName} trial for ${data.businessName} is now active.`,
    heading: "Your trial has started",
    badge: { label: "Trial", tone: "warning" },
    introHtml: [
      renderParagraph(`Your <strong>${data.planName}</strong> trial for <strong>${data.businessName}</strong> is now active.`),
      data.trialEndsAt
        ? renderParagraph(`Your trial ends on <strong>${formatSubscriptionDate(data.trialEndsAt)}</strong>.`)
        : renderParagraph("Use this time to set up your storefront and explore TownHub."),
      renderMutedParagraph("We'll remind you before your trial ends."),
    ].join(""),
    includeNextSteps: true,
    actionLabel: "Open Business Hub",
    actionUrl: data.businessHubUrl,
    secondaryActions: subscriptionOnboardingSecondaryActions(data),
  });
}

export function buildSubscriptionTrialEndingEmail(
  data: SubscriptionNotificationData,
  daysRemaining: 7 | 1,
): EmailContent {
  const heading = daysRemaining === 1 ? "Your trial ends tomorrow" : "Your trial ends in 7 days";
  const subject =
    daysRemaining === 1
      ? `Trial ending tomorrow — ${data.businessName}`
      : `Trial ending in 7 days — ${data.businessName}`;

  return buildSubscriptionEmail(data, {
    subject,
    preheader: `${data.businessName}'s TownHub trial ends ${daysRemaining === 1 ? "tomorrow" : "in 7 days"}.`,
    heading,
    badge: { label: daysRemaining === 1 ? "Ends tomorrow" : "7 days left", tone: "warning" },
    introHtml: [
      renderParagraph(
        `This is a friendly reminder that the <strong>${data.planName}</strong> trial for <strong>${data.businessName}</strong> ${
          daysRemaining === 1 ? "ends tomorrow" : "ends in 7 days"
        }.`,
      ),
      data.trialEndsAt
        ? renderParagraph(`Trial end date: <strong>${formatSubscriptionDate(data.trialEndsAt)}</strong>.`)
        : "",
      renderParagraph(
        "When your trial ends, billing will continue on your selected plan unless you cancel in Manage Billing.",
      ),
    ].join(""),
    actionLabel: "Open Business Hub",
    actionUrl: data.businessHubUrl,
    secondaryActionLabel: "Manage Billing",
    secondaryActionUrl: data.manageBillingUrl,
    footerNote: "Stripe sends receipts and invoices separately when billing begins.",
  });
}

export function buildSubscriptionActivatedEmail(data: SubscriptionNotificationData): EmailContent {
  return buildSubscriptionEmail(data, {
    subject: `Subscription activated — ${data.planName}`,
    preheader: `${data.businessName} is now on a paid ${data.planName} subscription.`,
    heading: "Subscription activated",
    badge: { label: "Active", tone: "success" },
    introHtml: [
      renderParagraph(
        `Your trial has ended and <strong>${data.businessName}</strong> is now on an active <strong>${data.planName}</strong> subscription.`,
      ),
      data.nextBillingDate
        ? renderParagraph(`Your next billing date is <strong>${formatSubscriptionDate(data.nextBillingDate)}</strong>.`)
        : "",
      renderMutedParagraph("Stripe sends the official receipt and invoice for this payment separately."),
    ].join(""),
    actionLabel: "Manage Billing",
    actionUrl: data.manageBillingUrl,
    hideSecondaryAction: true,
  });
}

export function buildSubscriptionPaymentSucceededEmail(data: SubscriptionNotificationData): EmailContent {
  return buildSubscriptionEmail(data, {
    subject: `Payment received — ${data.planName}`,
    preheader: `Your TownHub subscription payment for ${data.businessName} was successful.`,
    heading: "Payment received",
    badge: { label: "Paid", tone: "success" },
    introHtml: [
      renderParagraph(
        `Your recurring TownHub subscription payment for <strong>${data.businessName}</strong> on the <strong>${data.planName}</strong> plan was successful.`,
      ),
      data.nextBillingDate
        ? renderParagraph(`Your next billing date is <strong>${formatSubscriptionDate(data.nextBillingDate)}</strong>.`)
        : "",
      renderMutedParagraph("This is a TownHub account update — not a receipt. Stripe sends the official receipt and invoice separately."),
    ].join(""),
    detailOptions: { includeTrialEnd: false, includeAmount: true },
    actionLabel: "Manage Billing",
    actionUrl: data.manageBillingUrl,
    hideSecondaryAction: true,
  });
}

export function buildSubscriptionPaymentFailedEmail(data: SubscriptionNotificationData): EmailContent {
  return buildSubscriptionEmail(data, {
    subject: `Action required — payment failed for ${data.businessName}`,
    preheader: `Update your payment method to keep ${data.businessName} on TownHub.`,
    heading: "Payment failed",
    badge: { label: "Past due", tone: "danger" },
    introHtml: [
      renderParagraph(
        `We couldn't process the latest payment for <strong>${data.businessName}</strong>'s <strong>${data.planName}</strong> subscription.`,
      ),
      renderParagraph(`Current status: <strong>${escapeHtml(data.statusLabel)}</strong>.`),
      renderParagraph(data.gracePeriodNote ?? GRACE_PERIOD_NOTE),
      renderMutedParagraph("Stripe may also send its own billing notice. Updating your card below is the fastest way to restore service."),
    ].join(""),
    detailOptions: { includeTrialEnd: false },
    actionLabel: "Update Payment Method",
    actionUrl: data.manageBillingUrl,
    hideSecondaryAction: true,
    footerNote: "If you've already updated your payment method, you can ignore this message.",
  });
}

export function buildSubscriptionCancelScheduledEmail(data: SubscriptionNotificationData): EmailContent {
  return buildSubscriptionEmail(data, {
    subject: `Cancellation scheduled — ${data.businessName}`,
    preheader: `${data.businessName}'s TownHub subscription is scheduled to cancel.`,
    heading: "Cancellation scheduled",
    badge: { label: "Canceling", tone: "warning" },
    introHtml: [
      renderParagraph(
        `Your <strong>${data.planName}</strong> subscription for <strong>${data.businessName}</strong> is scheduled to cancel.`,
      ),
      renderParagraph(
        `Your subscription remains <strong>active until ${formatSubscriptionDate(data.cancellationDate ?? data.nextBillingDate)}</strong>. You keep full access until then.`,
      ),
      renderParagraph("You can reactivate anytime before that date in Manage Billing."),
    ].join(""),
    detailOptions: { includeTrialEnd: false, includeCancellationDate: true },
    actionLabel: "Manage Billing",
    actionUrl: data.manageBillingUrl,
    hideSecondaryAction: true,
  });
}

export function buildSubscriptionCanceledEmail(data: SubscriptionNotificationData): EmailContent {
  return buildSubscriptionEmail(data, {
    subject: `Subscription ended — ${data.businessName}`,
    preheader: `${data.businessName}'s TownHub subscription has ended.`,
    heading: "Subscription ended",
    badge: { label: "Canceled", tone: "neutral" },
    introHtml: [
      renderParagraph(
        `The TownHub subscription for <strong>${data.businessName}</strong> on the <strong>${data.planName}</strong> plan has ended.`,
      ),
      renderParagraph("Paid features have been disabled. Resubscribe anytime to restore access."),
    ].join(""),
    includeDetails: true,
    detailOptions: { includeTrialEnd: false },
    actionLabel: "Reactivate Subscription",
    actionUrl: data.reactivateSubscriptionUrl,
    hideSecondaryAction: true,
  });
}

export function buildSubscriptionExpiredEmail(data: SubscriptionNotificationData): EmailContent {
  return buildSubscriptionEmail(data, {
    subject: `Subscription expired — ${data.businessName}`,
    preheader: `${data.businessName}'s TownHub subscription expired after failed payments.`,
    heading: "Subscription expired",
    badge: { label: "Expired", tone: "danger" },
    introHtml: [
      renderParagraph(
        `The TownHub subscription for <strong>${data.businessName}</strong> expired after repeated failed payments.`,
      ),
      renderParagraph("Paid features have been disabled. Update your payment method and resubscribe to restore access."),
    ].join(""),
    includeDetails: true,
    detailOptions: { includeTrialEnd: false },
    actionLabel: "Reactivate Subscription",
    actionUrl: data.reactivateSubscriptionUrl,
    hideSecondaryAction: true,
  });
}

export function buildSubscriptionLifecycleEmail(
  event: SubscriptionNotificationEvent,
  data: SubscriptionNotificationData,
  options?: { trialDaysRemaining?: 7 | 1 },
): EmailContent {
  switch (event) {
    case "SUBSCRIPTION_WELCOME":
      return buildSubscriptionWelcomeEmail(data);
    case "SUBSCRIPTION_TRIAL_STARTED":
      return buildSubscriptionTrialStartedEmail(data);
    case "SUBSCRIPTION_TRIAL_ENDING_7D":
      return buildSubscriptionTrialEndingEmail(data, options?.trialDaysRemaining ?? 7);
    case "SUBSCRIPTION_TRIAL_ENDING_1D":
      return buildSubscriptionTrialEndingEmail(data, options?.trialDaysRemaining ?? 1);
    case "SUBSCRIPTION_ACTIVATED":
      return buildSubscriptionActivatedEmail(data);
    case "SUBSCRIPTION_PAYMENT_SUCCEEDED":
      return buildSubscriptionPaymentSucceededEmail(data);
    case "SUBSCRIPTION_PAYMENT_FAILED":
      return buildSubscriptionPaymentFailedEmail(data);
    case "SUBSCRIPTION_CANCEL_SCHEDULED":
      return buildSubscriptionCancelScheduledEmail(data);
    case "SUBSCRIPTION_CANCELED":
      return buildSubscriptionCanceledEmail(data);
    case "SUBSCRIPTION_EXPIRED":
      return buildSubscriptionExpiredEmail(data);
    default: {
      const exhaustive: never = event;
      throw new Error(`Unknown subscription notification event: ${exhaustive}`);
    }
  }
}

export {
  helpCenterUrl,
  helpCenterWelcomeVideoUrl,
  helpCenterBusinessOwnerTrainingUrl,
  helpCenterCustomerTrainingUrl,
  dashboardBusinessHubUrl,
};
