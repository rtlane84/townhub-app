import { dashboardSubscriptionUrl } from "../notification-urls";
import { renderDetailTable } from "./components";
import { renderEmailLayout, renderParagraph, renderMutedParagraph } from "./layout";
import type { EmailContent, PlatformAdminSubscriptionEvent, SubscriptionNotificationData } from "./types";

function adminDetailRows(data: SubscriptionNotificationData) {
  return [
    { label: "Business", value: data.businessName },
    { label: "Business ID", value: String(data.businessId) },
    { label: "Plan", value: data.planName },
    { label: "Status", value: data.statusLabel },
    { label: "Price", value: data.priceLabel },
  ];
}

function buildAdminSubscriptionEmail(
  data: SubscriptionNotificationData,
  config: {
    subject: string;
    preheader: string;
    heading: string;
    introHtml: string;
    footerNote?: string;
  },
): EmailContent {
  const subscriptionUrl = dashboardSubscriptionUrl();
  const bodyHtml = [config.introHtml, renderDetailTable(adminDetailRows(data))].join("");

  const html = renderEmailLayout({
    preheader: config.preheader,
    heading: config.heading,
    bodyHtml,
    actionLabel: "View in Admin",
    actionUrl: subscriptionUrl,
    footerNote: config.footerNote,
  });

  const text = [
    config.heading,
    "",
    config.preheader,
    "",
    ...adminDetailRows(data).map((row) => `${row.label}: ${row.value}`),
    "",
    `View subscription: ${subscriptionUrl}`,
    config.footerNote ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: config.subject, text, html };
}

export function buildPlatformAdminSubscriptionEmail(
  event: PlatformAdminSubscriptionEvent,
  data: SubscriptionNotificationData,
): EmailContent {
  switch (event) {
    case "ADMIN_SUBSCRIPTION_PAID_STARTED":
      return buildAdminSubscriptionEmail(data, {
        subject: `[TownHub] Paid subscription started — ${data.businessName}`,
        preheader: `${data.businessName} started a paid ${data.planName} subscription.`,
        heading: "Paid subscription started",
        introHtml: renderParagraph(
          `<strong>${data.businessName}</strong> started a paid <strong>${data.planName}</strong> subscription.`,
        ),
      });
    case "ADMIN_TRIAL_STARTED":
      return buildAdminSubscriptionEmail(data, {
        subject: `[TownHub] Trial started — ${data.businessName}`,
        preheader: `${data.businessName} started a ${data.planName} trial.`,
        heading: "Trial started",
        introHtml: renderParagraph(
          `<strong>${data.businessName}</strong> started a <strong>${data.planName}</strong> trial on TownHub.`,
        ),
      });
    case "ADMIN_PAYMENT_FAILED":
      return buildAdminSubscriptionEmail(data, {
        subject: `[TownHub] Payment failed — ${data.businessName}`,
        preheader: `Subscription payment failed for ${data.businessName}.`,
        heading: "Subscription payment failed",
        introHtml: [
          renderParagraph(
            `A subscription payment failed for <strong>${data.businessName}</strong> on the <strong>${data.planName}</strong> plan.`,
          ),
          renderMutedParagraph("The business owner has been emailed with instructions to update their payment method."),
        ].join(""),
      });
    case "ADMIN_SUBSCRIPTION_CANCELED":
      return buildAdminSubscriptionEmail(data, {
        subject: `[TownHub] Subscription canceled — ${data.businessName}`,
        preheader: `${data.businessName}'s subscription has ended.`,
        heading: "Subscription canceled",
        introHtml: renderParagraph(
          `The TownHub subscription for <strong>${data.businessName}</strong> on <strong>${data.planName}</strong> has ended.`,
        ),
      });
    case "ADMIN_SUBSCRIPTION_EXPIRED":
      return buildAdminSubscriptionEmail(data, {
        subject: `[TownHub] Subscription expired — ${data.businessName}`,
        preheader: `${data.businessName}'s subscription expired after failed payments.`,
        heading: "Subscription expired",
        introHtml: renderParagraph(
          `The TownHub subscription for <strong>${data.businessName}</strong> expired after failed payments.`,
        ),
      });
    default: {
      const exhaustive: never = event;
      throw new Error(`Unknown admin subscription notification event: ${exhaustive}`);
    }
  }
}
