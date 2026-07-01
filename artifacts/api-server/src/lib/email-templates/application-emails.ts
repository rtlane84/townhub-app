import {
  dashboardBusinessHubUrl,
  dashboardSubscriptionUrl,
  helpCenterBusinessOwnerTrainingUrl,
  helpCenterUrl,
} from "../notification-urls";
import { formatOrderDateTime, renderDetailTable, renderStatusBadge } from "./components";
import { renderEmailLayout, renderParagraph, renderMutedParagraph } from "./layout";
import {
  APPLICATION_APPROVED_NEXT_STEPS,
  COMPLIMENTARY_APPROVED_NEXT_STEPS,
  onboardingNextStepsPlainText,
  onboardingSecondaryLinks,
  renderOnboardingNextStepsSection,
} from "./onboarding-email-sections";
import type { EmailContent } from "./types";

export type ApplicationApprovedEmailData = {
  businessName: string;
  planName: string;
  statusLabel: string;
  priceLabel: string;
  billingInterval?: "monthly" | "yearly" | null;
  trialEndsAt?: Date | string | null;
  requiresCheckout: boolean;
  businessHubUrl: string;
  subscriptionUrl: string;
  businessOwnerTrainingUrl: string;
  helpCenterUrl: string;
};

function formatDate(value?: Date | string | null): string {
  if (!value) return "—";
  return formatOrderDateTime(value);
}

function formatBillingInterval(interval?: "monthly" | "yearly" | null): string {
  if (interval === "yearly") return "Yearly";
  if (interval === "monthly") return "Monthly";
  return "Not set";
}

export function buildApplicationApprovedEmail(data: ApplicationApprovedEmailData): EmailContent {
  const detailRows = [
    { label: "Business", value: data.businessName },
    { label: "Plan", value: data.planName },
    { label: "Status", value: data.statusLabel },
    { label: "Billing", value: formatBillingInterval(data.billingInterval) },
    { label: "Price", value: data.priceLabel },
  ];

  if (data.trialEndsAt && !data.requiresCheckout) {
    detailRows.push({ label: "Trial ends", value: formatDate(data.trialEndsAt) });
  }

  const heading = data.requiresCheckout
    ? "Your application was approved"
    : "Welcome to TownHub";

  const subject = data.requiresCheckout
    ? `Application approved — complete your ${data.planName} subscription`
    : `Application approved — welcome to TownHub`;

  const preheader = data.requiresCheckout
    ? `${data.businessName} was approved. Complete subscription setup to go live.`
    : `${data.businessName} was approved and is ready to set up on TownHub.`;

  const badge = data.requiresCheckout
    ? { label: "Setup required", tone: "warning" as const }
    : data.statusLabel.toLowerCase().includes("trial")
      ? { label: "Trial", tone: "warning" as const }
      : { label: "Approved", tone: "success" as const };

  const introHtml = data.requiresCheckout
    ? [
        renderParagraph(`Great news — <strong>${data.businessName}</strong> has been approved for TownHub.`),
        renderParagraph(
          `Your <strong>${data.planName}</strong> plan is assigned. Complete subscription checkout in the Business Hub to activate billing and unlock paid features.`,
        ),
        renderMutedParagraph(
          "Stripe will send official receipts and invoices after checkout. TownHub sends account updates like this one.",
        ),
      ].join("")
    : [
        renderParagraph(`Great news — <strong>${data.businessName}</strong> has been approved for TownHub.`),
        renderParagraph(
          `Your <strong>${data.planName}</strong> plan is active${data.trialEndsAt ? ` with a trial through <strong>${formatDate(data.trialEndsAt)}</strong>` : ""}.`,
        ),
        renderMutedParagraph(
          "TownHub sends onboarding updates like this one. Stripe sends payment receipts separately when billing begins.",
        ),
      ].join("");

  const nextSteps = data.requiresCheckout
    ? APPLICATION_APPROVED_NEXT_STEPS
    : COMPLIMENTARY_APPROVED_NEXT_STEPS;

  const bodyHtml = [
    `<div style="text-align:center;margin-bottom:20px;">${renderStatusBadge(badge.label, badge.tone)}</div>`,
    introHtml,
    renderDetailTable(detailRows),
    renderOnboardingNextStepsSection(nextSteps),
  ].join("");

  const primaryLabel = data.requiresCheckout ? "Complete Subscription Setup" : "Open Business Hub";
  const primaryUrl = data.requiresCheckout ? data.subscriptionUrl : data.businessHubUrl;
  const secondaryActions = onboardingSecondaryLinks(data);

  const html = renderEmailLayout({
    preheader,
    businessName: data.businessName,
    heading,
    bodyHtml,
    actionLabel: primaryLabel,
    actionUrl: primaryUrl,
    secondaryActions,
  });

  const text = [
    heading,
    "",
    preheader,
    "",
    ...detailRows.map((row) => `${row.label}: ${row.value}`),
    "",
    onboardingNextStepsPlainText(nextSteps),
    "",
    `${primaryLabel}: ${primaryUrl}`,
    ...secondaryActions.map((link) => `${link.label}: ${link.url}`),
  ].join("\n");

  return { subject, text, html };
}

export function defaultApplicationApprovedEmailData(
  input: Omit<ApplicationApprovedEmailData, "businessHubUrl" | "subscriptionUrl" | "businessOwnerTrainingUrl" | "helpCenterUrl">,
): ApplicationApprovedEmailData {
  return {
    ...input,
    businessHubUrl: dashboardBusinessHubUrl(),
    subscriptionUrl: dashboardSubscriptionUrl(),
    businessOwnerTrainingUrl: helpCenterBusinessOwnerTrainingUrl(),
    helpCenterUrl: helpCenterUrl(),
  };
}
