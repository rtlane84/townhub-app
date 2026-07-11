import type { Page } from "@playwright/test";
import { pageApiJson } from "./page-api";
import { gotoAdminDashboard } from "./navigation";

export type SubscriptionFeature = {
  id: number;
  key: string;
  name: string;
};

type BusinessSubscription = {
  planId: number;
};

export async function listSubscriptionFeatures(page: Page): Promise<SubscriptionFeature[]> {
  await gotoAdminDashboard(page, "/dashboard/admin/system-status");
  await page.getByRole("heading", { name: "Operations Center" }).waitFor({ state: "visible" });
  const { ok, status, data } = await pageApiJson<SubscriptionFeature[]>(
    page,
    "/api/admin/subscription-features",
  );
  if (!ok) {
    throw new Error(`Failed to list subscription features: ${status}`);
  }
  return data;
}

export async function getBusinessSubscriptionPlanId(page: Page, businessId: number): Promise<number> {
  const { ok, status, data } = await pageApiJson<BusinessSubscription>(
    page,
    `/api/admin/businesses/${businessId}/subscription`,
  );
  if (!ok) {
    throw new Error(`Failed to load business subscription: ${status}`);
  }
  return data.planId;
}

export async function getPlanFeatureIds(page: Page, planId: number): Promise<number[]> {
  const { ok, status, data } = await pageApiJson<SubscriptionFeature[]>(
    page,
    `/api/admin/subscription-plans/${planId}/features`,
  );
  if (!ok) {
    throw new Error(`Failed to load plan features: ${status}`);
  }
  return data.map((feature) => feature.id);
}

export async function setPlanFeatureIds(
  page: Page,
  planId: number,
  featureIds: number[],
): Promise<void> {
  const { ok, status } = await pageApiJson(page, `/api/admin/subscription-plans/${planId}/features`, {
    method: "PUT",
    body: { featureIds },
  });
  if (!ok) {
    throw new Error(`Failed to update plan features: ${status}`);
  }
}

export async function snapshotPlanFeatures(page: Page, planId: number): Promise<number[]> {
  const mapped = await getPlanFeatureIds(page, planId);
  if (mapped.length > 0) return mapped;

  const catalog = await listSubscriptionFeatures(page);
  return catalog.map((feature) => feature.id);
}

export async function setOnlineOrderingEnabled(
  page: Page,
  planId: number,
  enabled: boolean,
): Promise<void> {
  const catalog = await listSubscriptionFeatures(page);
  const onlineOrdering = catalog.find((feature) => feature.key === "online_ordering");
  if (!onlineOrdering) {
    throw new Error("online_ordering feature not found in subscription catalog");
  }

  const currentIds = await snapshotPlanFeatures(page, planId);
  const withoutOrdering = currentIds.filter((id) => id !== onlineOrdering.id);
  const nextIds = enabled
    ? [...new Set([...withoutOrdering, onlineOrdering.id])]
    : withoutOrdering;

  await setPlanFeatureIds(page, planId, nextIds);
}
