import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { E2ECheckoutBusiness } from "./api";
import { e2eApiUrl, e2eBusinessSlugOverride } from "./env";
import { addFirstProductToCart, fillGuestCheckoutForm, openCartFromStorefront } from "./cart";
import { gotoStorefront } from "./navigation";
import { waitForApiCondition } from "./authed-api";
import { listOwnerBusinesses } from "./owner-business";

const ONLINE_PAYMENT_MODES = new Set(["BOTH", "ONLINE_ONLY"]);

type CheckoutContext = {
  paymentMode?: string | null;
  payAtPickupEnabled?: boolean | null;
  onlinePaymentsAvailable?: boolean | null;
};

type StorefrontResponse = {
  business: { id: number; slug: string; name: string; active: boolean };
  products: E2ECheckoutBusiness["product"][];
};

function allowsOnlinePayment(checkout: CheckoutContext): boolean {
  if (checkout.paymentMode && ONLINE_PAYMENT_MODES.has(checkout.paymentMode)) {
    return true;
  }
  return checkout.payAtPickupEnabled === false;
}

async function resolveStripeBusinessFromSlug(slug: string): Promise<E2ECheckoutBusiness | null> {
  const storefrontResponse = await fetch(`${e2eApiUrl()}/api/businesses/${slug}`);
  if (!storefrontResponse.ok) return null;
  const storefront = (await storefrontResponse.json()) as StorefrontResponse;
  if (!storefront.business.active) return null;

  const checkoutResponse = await fetch(
    `${e2eApiUrl()}/api/businesses/checkout/${storefront.business.id}`,
  );
  if (!checkoutResponse.ok) return null;
  const checkout = (await checkoutResponse.json()) as CheckoutContext;
  if (!allowsOnlinePayment(checkout) || checkout.onlinePaymentsAvailable !== true) return null;

  const product = storefront.products.find(
    (item) => item.available && (item.optionGroups?.length ?? 0) === 0,
  );
  if (!product) return null;

  return {
    id: storefront.business.id,
    slug: storefront.business.slug,
    name: storefront.business.name,
    product,
    taxEnabled: false,
    taxRatePercent: null,
  };
}

export async function findOwnerStripeCheckoutBusiness(
  page: Page,
): Promise<E2ECheckoutBusiness> {
  const overrideSlug = e2eBusinessSlugOverride();
  if (overrideSlug) {
    const business = await resolveStripeBusinessFromSlug(overrideSlug);
    if (!business) {
      throw new Error(`E2E_BUSINESS_SLUG=${overrideSlug} is not Stripe-checkout-ready.`);
    }
    return business;
  }

  const owned = await listOwnerBusinesses(page);
  for (const business of owned) {
    const match = await resolveStripeBusinessFromSlug(business.slug);
    if (match) return match;
  }

  throw new Error(
    "No Stripe-checkout-ready business owned by the test owner. Connect Stripe and enable online payments.",
  );
}

export function isStripeCheckoutE2EEnabled(): boolean {
  return process.env.E2E_STRIPE_CHECKOUT?.trim() === "1";
}

export const STRIPE_CHECKOUT_SKIP_REASON =
  "Stripe checkout E2E disabled. Set E2E_STRIPE_CHECKOUT=1 with Stripe test keys and webhook forwarding.";

export async function submitCardCheckoutFromCart(page: Page): Promise<void> {
  const payWithCard = page.getByRole("button", { name: /pay with card/i });
  await payWithCard.waitFor({ state: "visible" });
  await payWithCard.click();
}

export async function completeStripeHostedCheckoutIfPresent(page: Page): Promise<"mock" | "stripe" | "inline"> {
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith("/order/") ||
      url.hostname.includes("stripe.com") ||
      url.searchParams.has("mock"),
    { timeout: 60_000 },
  );

  const url = page.url();
  if (url.includes("checkout.stripe.com")) {
    const cardFrame = page.frameLocator('iframe[name*="card"]').first();
    await cardFrame.locator('[name="cardnumber"], [placeholder*="Card number"]').fill("4242424242424242");
    await cardFrame.locator('[name="exp-date"], [placeholder*="MM"]').fill("1234");
    await cardFrame.locator('[name="cvc"], [placeholder*="CVC"]').fill("123");
    await cardFrame.locator('[name="postal"], [placeholder*="ZIP"]').fill("12345").catch(() => {});

    const payButton = page.getByRole("button", { name: /pay/i });
    if (await payButton.isVisible().catch(() => false)) {
      await payButton.click();
    } else {
      await page.locator('button[type="submit"]').first().click();
    }

    await page.waitForURL(/\/order\/\d+/, { timeout: 90_000 });
    return "stripe";
  }

  if (new URL(url).searchParams.has("mock")) {
    return "mock";
  }

  if (url.includes("/order/")) {
    return "inline";
  }

  return "inline";
}

export async function placeGuestCardOrder(
  page: Page,
  business: E2ECheckoutBusiness,
): Promise<{ orderId: number; accessToken: string | null }> {
  await gotoStorefront(page, business.slug);
  await addFirstProductToCart(page, business);
  await openCartFromStorefront(page);
  await fillGuestCheckoutForm(page);
  await submitCardCheckoutFromCart(page);
  await completeStripeHostedCheckoutIfPresent(page);

  await expect(page.getByRole("heading", { name: "Order Received!" })).toBeVisible({ timeout: 60_000 });

  const confirmationUrl = new URL(page.url());
  const orderId = Number(confirmationUrl.pathname.split("/").pop());
  const accessToken = confirmationUrl.searchParams.get("token");

  return { orderId, accessToken };
}

export async function waitForOrderPaid(
  orderId: number,
  accessToken: string | null,
): Promise<void> {
  await waitForApiCondition(
    async () => {
      const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
      const response = await fetch(`${e2eApiUrl()}/api/orders/${orderId}${tokenQuery}`);
      if (!response.ok) return false;
      const order = (await response.json()) as { paymentStatus?: string };
      return order.paymentStatus === "PAID";
    },
    { timeoutMs: 90_000, label: `order ${orderId} paymentStatus PAID` },
  );
}
