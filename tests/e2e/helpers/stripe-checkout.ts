import type { Locator, Page } from "@playwright/test";
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

async function fillVisible(locator: Locator, value: string): Promise<boolean> {
  try {
    await locator.waitFor({ state: "visible", timeout: 8_000 });
    await locator.fill(value);
    return true;
  } catch {
    return false;
  }
}

/** Stripe hosted Checkout Accordion UI — Card fields appear only after Card is selected. */
async function completeStripeHostedCheckout(
  page: Page,
  guest?: { email?: string; name?: string },
): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("heading", { name: /payment method/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const emailField = page.getByRole("textbox", { name: /^email$/i });
  await emailField.waitFor({ state: "visible", timeout: 30_000 });
  const currentEmail = await emailField.inputValue().catch(() => "");
  if (!currentEmail.trim()) {
    await emailField.fill(guest?.email ?? "e2e.stripe.guest@example.com");
  }

  // Link "save info" can require phone and complicate the card accordion.
  const saveInfo = page.getByRole("checkbox", { name: /save my information/i });
  if (await saveInfo.isVisible().catch(() => false)) {
    if (await saveInfo.isChecked().catch(() => false)) {
      await saveInfo.uncheck({ force: true });
    }
  }

  const cardNumberReady = async (): Promise<boolean> => {
    for (const frame of page.frames()) {
      const input = frame
        .locator(
          'input[name="number"], input[name="cardnumber"], input[autocomplete="cc-number"], input[placeholder*="1234"]',
        )
        .first();
      if ((await input.count().catch(() => 0)) === 0) continue;
      // Attached is enough — Stripe often reports these as not "visible" briefly.
      if (await input.isEnabled().catch(() => false)) return true;
    }
    return false;
  };

  const selectCardMethod = async (): Promise<void> => {
    if (await cardNumberReady()) return;

    // Prefer the Card row: the AccordionButton is often opacity/size-hidden and
    // fails Playwright visibility checks even when the row is clickable.
    const cardRow = page.getByRole("listitem").filter({
      has: page.getByRole("radio", { name: /^card$/i }),
    });
    await cardRow.scrollIntoViewIfNeeded();
    await cardRow.click();

    if (await cardNumberReady()) return;

    await page.getByTestId("card-accordion-item-button").click({ force: true });
    if (await cardNumberReady()) return;

    await page.getByRole("radio", { name: /^card$/i }).click({ force: true });
  };

  await selectCardMethod();
  await expect
    .poll(async () => cardNumberReady(), { timeout: 20_000 })
    .toBeTruthy();

  const cardNumberCandidates = [
    page.frameLocator('iframe[title*="card number" i]').locator("input").first(),
    page
      .frameLocator('iframe[src*="elements-inner-card"], iframe[src*="elements-inner-payment"]')
      .locator('input[name="number"], input[name="cardnumber"], input[placeholder*="1234"], input')
      .first(),
    page
      .frameLocator('iframe[name*="card"]')
      .locator('[name="cardnumber"], [name="number"], [placeholder*="Card number"], [placeholder*="1234"]')
      .first(),
    page.getByPlaceholder(/card number|1234 1234/i),
  ];

  let filledNumber = false;
  for (const candidate of cardNumberCandidates) {
    if (await fillVisible(candidate, "4242424242424242")) {
      filledNumber = true;
      break;
    }
  }
  if (!filledNumber) {
    // Last resort: type into whichever enabled card input exists across frames.
    for (const frame of page.frames()) {
      const input = frame
        .locator(
          'input[name="number"], input[name="cardnumber"], input[autocomplete="cc-number"]',
        )
        .first();
      if ((await input.count().catch(() => 0)) === 0) continue;
      try {
        await input.fill("4242424242424242", { force: true, timeout: 5_000 });
        filledNumber = true;
        break;
      } catch {
        // try next frame
      }
    }
  }
  if (!filledNumber) {
    throw new Error("Could not find Stripe Checkout card number field after selecting Card");
  }

  const expiryCandidates = [
    page.frameLocator('iframe[title*="expir" i]').locator("input").first(),
    page
      .frameLocator('iframe[src*="elements-inner-card"], iframe[src*="elements-inner-payment"]')
      .locator('input[name="expiry"], input[name="exp-date"], input[placeholder*="MM"]')
      .first(),
    page
      .frameLocator('iframe[name*="card"], iframe[name*="exp"]')
      .locator('[name="exp-date"], [name="expiry"], [placeholder*="MM"]')
      .first(),
    page.getByPlaceholder(/MM\s*\/\s*YY/i),
  ];
  for (const candidate of expiryCandidates) {
    if (await fillVisible(candidate, "1234")) break;
  }

  const cvcCandidates = [
    page.frameLocator('iframe[title*="CVC" i], iframe[title*="security code" i]').locator("input").first(),
    page
      .frameLocator('iframe[src*="elements-inner-card"], iframe[src*="elements-inner-payment"]')
      .locator('input[name="cvc"], input[placeholder*="CVC"]')
      .first(),
    page
      .frameLocator('iframe[name*="card"], iframe[name*="cvc"]')
      .locator('[name="cvc"], [placeholder*="CVC"]')
      .first(),
    page.getByPlaceholder(/CVC|CVV/i),
  ];
  for (const candidate of cvcCandidates) {
    if (await fillVisible(candidate, "123")) break;
  }

  const cardholderName = guest?.name ?? "E2E Guest Customer";
  const nameField = page.getByRole("textbox", { name: /cardholder name|name on card/i });
  if (await nameField.isVisible().catch(() => false)) {
    await nameField.fill(cardholderName);
  } else {
    await page.getByPlaceholder(/full name on card|name on card/i).fill(cardholderName).catch(() => {});
  }

  const postal = page.getByPlaceholder(/ZIP|Postal/i);
  if (await postal.isVisible().catch(() => false)) {
    await postal.fill("12345").catch(() => {});
  } else {
    await page
      .frameLocator('iframe[src*="elements-inner-card"], iframe[src*="elements-inner-payment"]')
      .locator('input[name="postalCode"], input[placeholder*="ZIP"]')
      .first()
      .fill("12345")
      .catch(() => {});
  }

  // Prefer the primary Pay submit — avoid matching "Pay with card" / Apple Pay.
  const payButton = page.getByRole("button", { name: /^pay$/i });
  if (await payButton.isVisible().catch(() => false)) {
    await payButton.click();
  } else {
    const hostedSubmit = page.getByTestId("hosted-payment-submit-button");
    if (await hostedSubmit.isVisible().catch(() => false)) {
      await hostedSubmit.click();
    } else {
      await page.locator('button[type="submit"]').last().click();
    }
  }

  await page.waitForURL(/\/order\/\d+|\/native-checkout-return\//, { timeout: 90_000 });
}

export async function completeStripeHostedCheckoutIfPresent(
  page: Page,
  guest?: { email?: string; name?: string },
): Promise<"mock" | "stripe" | "inline"> {
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith("/order/") ||
      url.pathname.startsWith("/native-checkout-return") ||
      url.hostname.includes("stripe.com") ||
      url.searchParams.has("mock"),
    { timeout: 60_000 },
  );

  const url = page.url();
  if (url.includes("checkout.stripe.com")) {
    await completeStripeHostedCheckout(page, guest);
    // Bounce page may land first; wait for confirmation order URL.
    if (!/\/order\/\d+/.test(page.url())) {
      await page.waitForURL(/\/order\/\d+/, { timeout: 90_000 });
    }
    return "stripe";
  }

  if (new URL(url).searchParams.has("mock")) {
    return "mock";
  }

  if (url.includes("/order/") || url.includes("/native-checkout-return")) {
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
  const guest = await fillGuestCheckoutForm(page);
  await submitCardCheckoutFromCart(page);
  await completeStripeHostedCheckoutIfPresent(page, {
    email: guest.email,
    name: guest.name,
  });

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
