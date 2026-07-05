import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { fetchOrderById } from "./api";
import { waitForApiCondition } from "./authed-api";
import { gotoOwnerDashboard } from "./navigation";

export async function issueFullRefundViaUi(page: Page, orderId: number): Promise<void> {
  await gotoOwnerDashboard(page, `/dashboard/business/orders/${orderId}`);
  await page.getByTestId("button-issue-refund").click();
  await expect(page.getByTestId("button-confirm-refund")).toBeVisible();
  await page.getByTestId("button-confirm-refund").click();
  await expect(page.getByText(/refund issued|refund history/i).first()).toBeVisible({ timeout: 60_000 });
}

export async function waitForOrderRefunded(
  orderId: number,
  accessToken: string | null,
): Promise<void> {
  await waitForApiCondition(
    async () => {
      const order = await fetchOrderById(orderId, accessToken);
      return order.refundStatus === "FULL" || order.paymentStatus === "REFUNDED";
    },
    { label: `order ${orderId} refunded`, timeoutMs: 90_000 },
  );
}
