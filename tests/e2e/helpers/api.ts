import { e2eApiUrl, e2eBusinessSlugOverride } from "./env";

const PAY_AT_PICKUP_MODES = new Set(["BOTH", "PAY_AT_PICKUP_ONLY"]);
const ONLINE_PAYMENT_MODES = new Set(["BOTH", "ONLINE_ONLY"]);

export type E2EProduct = {
  id: number;
  name: string;
  price: number;
  available: boolean;
  optionGroups?: unknown[];
};

export type E2ECheckoutBusiness = {
  id: number;
  slug: string;
  name: string;
  product: E2EProduct;
  taxEnabled: boolean;
  taxRatePercent: number | null;
};

type BusinessSummary = {
  id: number;
  slug: string;
  name: string;
  active: boolean;
  paymentMode?: string | null;
  payAtPickupEnabled?: boolean | null;
};

type StorefrontResponse = {
  business: { id: number; slug: string; name: string; active: boolean; storefrontMode?: string | null };
  products: E2EProduct[];
};

type CheckoutContext = {
  id: number;
  paymentMode?: string | null;
  payAtPickupEnabled?: boolean | null;
  taxEnabled?: boolean;
  taxRatePercent?: number | null;
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${e2eApiUrl()}${path}`, init);
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function waitForApiReady(options?: {
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const intervalMs = options?.intervalMs ?? 1_000;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const health = await fetchJson<{ status: string }>("/health");
      if (health.status === "ok") return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `API at ${e2eApiUrl()} did not become ready within ${timeoutMs}ms` +
      (lastError ? `: ${String(lastError)}` : ""),
  );
}

function allowsPayAtPickup(business: BusinessSummary | CheckoutContext): boolean {
  if (business.paymentMode && PAY_AT_PICKUP_MODES.has(business.paymentMode)) {
    return true;
  }
  return business.payAtPickupEnabled === true;
}

function pickSimpleProduct(products: E2EProduct[]): E2EProduct | undefined {
  return products.find(
    (product) =>
      product.available &&
      (product.optionGroups?.length ?? 0) === 0,
  );
}

function allowsOnlinePayment(business: BusinessSummary | CheckoutContext): boolean {
  if (business.paymentMode && ONLINE_PAYMENT_MODES.has(business.paymentMode)) {
    return true;
  }
  return business.payAtPickupEnabled === false;
}

async function resolveCheckoutBusinessFromSlug(
  slug: string,
  options: { requireOnlinePayment?: boolean } = {},
): Promise<E2ECheckoutBusiness | null> {
  const storefront = await fetchJson<StorefrontResponse>(`/api/businesses/${slug}`);
  const checkout = await fetchJson<CheckoutContext & { stripeConnectedAccountId?: string | null }>(
    `/api/businesses/checkout/${storefront.business.id}`,
  );

  if (!storefront.business.active) return null;
  if (options.requireOnlinePayment) {
    if (!allowsOnlinePayment(checkout)) return null;
    if (!checkout.stripeConnectedAccountId) return null;
  } else if (!allowsPayAtPickup(checkout)) {
    return null;
  }

  const product = pickSimpleProduct(storefront.products);
  if (!product) return null;

  return {
    id: storefront.business.id,
    slug: storefront.business.slug,
    name: storefront.business.name,
    product,
    taxEnabled: checkout.taxEnabled === true,
    taxRatePercent: checkout.taxRatePercent ?? null,
  };
}

export async function findCheckoutBusiness(): Promise<E2ECheckoutBusiness> {
  const overrideSlug = e2eBusinessSlugOverride();
  if (overrideSlug) {
    const business = await resolveCheckoutBusinessFromSlug(overrideSlug);
    if (!business) {
      throw new Error(
        `E2E_BUSINESS_SLUG=${overrideSlug} is not checkout-ready (needs pay-at-pickup and an available product without required modifiers).`,
      );
    }
    return business;
  }

  const businesses = await fetchJson<BusinessSummary[]>("/api/businesses");

  for (const summary of businesses) {
    if (!summary.active) continue;
    if (!allowsPayAtPickup(summary)) continue;

    const business = await resolveCheckoutBusinessFromSlug(summary.slug);
    if (business) return business;
  }

  throw new Error(
    "No checkout-ready business found. Create an active business with pay-at-pickup enabled, " +
      "at least one available product without required modifiers, or set E2E_BUSINESS_SLUG.",
  );
}

export async function findStripeCheckoutBusiness(): Promise<E2ECheckoutBusiness> {
  const overrideSlug = e2eBusinessSlugOverride();
  if (overrideSlug) {
    const business = await resolveCheckoutBusinessFromSlug(overrideSlug, {
      requireOnlinePayment: true,
    });
    if (!business) {
      throw new Error(
        `E2E_BUSINESS_SLUG=${overrideSlug} is not Stripe-checkout-ready (needs online payment + Stripe Connect + simple product).`,
      );
    }
    return business;
  }

  const businesses = await fetchJson<BusinessSummary[]>("/api/businesses");

  for (const summary of businesses) {
    if (!summary.active) continue;
    const business = await resolveCheckoutBusinessFromSlug(summary.slug, {
      requireOnlinePayment: true,
    });
    if (business) return business;
  }

  throw new Error(
    "No Stripe-checkout-ready business found. Connect Stripe for a business with online payments, " +
      "or set E2E_BUSINESS_SLUG.",
  );
}

export async function fetchOrderById(
  orderId: number,
  accessToken?: string | null,
): Promise<{
  id: number;
  paymentStatus?: string;
  refundStatus?: string;
  status?: string;
  orderNumber?: string;
}> {
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
  return fetchJson(`/api/orders/${orderId}${tokenQuery}`);
}

export async function findAppointmentBusiness(): Promise<E2ECheckoutBusiness & { storefrontMode: string }> {
  const businesses = await fetchJson<BusinessSummary[]>("/api/businesses");

  for (const summary of businesses) {
    if (!summary.active) continue;
    const storefront = await fetchJson<StorefrontResponse>(`/api/businesses/${summary.slug}`);
    const mode = storefront.business.storefrontMode ?? "ORDERING";
    if (mode !== "APPOINTMENT") continue;

    const product = pickSimpleProduct(storefront.products);
    if (!product) continue;

    return {
      id: storefront.business.id,
      slug: storefront.business.slug,
      name: storefront.business.name,
      product,
      taxEnabled: false,
      taxRatePercent: null,
      storefrontMode: mode,
    };
  }

  throw new Error(
    "No appointment-mode business found. Set a business storefront mode to Appointments in owner settings.",
  );
}

export type CreateGuestOrderInput = {
  businessId: number;
  productId: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

export type CreateGuestOrderResult = {
  orderId: number;
  accessToken: string;
  orderNumber: string;
};

export async function createGuestPayAtPickupOrder(
  input: CreateGuestOrderInput,
): Promise<CreateGuestOrderResult> {
  const stamp = Date.now();
  const response = await fetch(`${e2eApiUrl()}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessId: input.businessId,
      fulfillmentType: "PICKUP",
      customerName: input.customerName ?? "E2E Guest",
      customerEmail: input.customerEmail ?? `e2e-order+${stamp}@example.com`,
      customerPhone: input.customerPhone ?? "555-010-9999",
      paymentMethod: "IN_PERSON",
      items: [{ productId: input.productId, quantity: 1 }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create guest order: ${response.status} ${body}`);
  }

  const order = (await response.json()) as {
    id: number;
    orderNumber: string;
    accessToken?: string;
  };

  if (!order.accessToken) {
    throw new Error("Guest order response did not include accessToken");
  }

  return {
    orderId: order.id,
    accessToken: order.accessToken,
    orderNumber: order.orderNumber,
  };
}
