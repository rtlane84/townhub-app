import { BORDER_COLOR, escapeHtml } from "./layout";

export type OnboardingLink = {
  label: string;
  url: string;
};

export const APPLICATION_APPROVED_NEXT_STEPS = [
  "Complete your subscription setup.",
  "Watch the Business Owner Quick Start video.",
  "Start building your storefront.",
] as const;

export const SUBSCRIPTION_STARTED_NEXT_STEPS = [
  "Watch the Business Owner Quick Start video.",
  "Finish building your storefront.",
  "Publish your business and start accepting customers.",
] as const;

export const COMPLIMENTARY_APPROVED_NEXT_STEPS = SUBSCRIPTION_STARTED_NEXT_STEPS;

export function renderOnboardingNextStepsSection(items: readonly string[]): string {
  const listItems = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  return `<div style="margin:24px 0;padding:20px;background:#f8fafc;border:1px solid ${BORDER_COLOR};border-radius:12px;">
    <div style="font-size:15px;font-weight:700;color:#1e3a5f;margin-bottom:12px;">Next Steps</div>
    <ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.9;color:#334155;">
      ${listItems}
    </ul>
  </div>`;
}

export function onboardingSecondaryLinks(links: {
  businessOwnerTrainingUrl: string;
  helpCenterUrl: string;
}): OnboardingLink[] {
  return [
    { label: "Watch Quick Start Video", url: links.businessOwnerTrainingUrl },
    { label: "Business Owner Help Center", url: links.helpCenterUrl },
  ];
}

export function onboardingNextStepsPlainText(items: readonly string[]): string {
  return ["Next steps:", ...items.map((item) => `• ${item}`)].join("\n");
}
