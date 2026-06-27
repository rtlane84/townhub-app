import { PaymentMode as PaymentModeValues, type PaymentMode } from "./generated/types/paymentMode";

const PAYMENT_MODES: PaymentMode[] = [
  PaymentModeValues.ONLINE_ONLY,
  PaymentModeValues.PAY_AT_PICKUP_ONLY,
  PaymentModeValues.BOTH,
];

export const PAYMENT_MODE_OPTIONS: Array<{
  value: PaymentMode;
  label: string;
  description: string;
}> = [
  {
    value: PaymentModeValues.ONLINE_ONLY,
    label: "Online payment only",
    description: "Customers pay by card online at checkout. Pay-at-pickup is not offered.",
  },
  {
    value: PaymentModeValues.PAY_AT_PICKUP_ONLY,
    label: "Pay at pickup only",
    description: "Customers place orders online but pay in person at pickup or delivery.",
  },
  {
    value: PaymentModeValues.BOTH,
    label: "Both online and pay at pickup",
    description: "Customers choose card online or pay when they arrive.",
  },
];

export function isPaymentMode(value: unknown): value is PaymentMode {
  return typeof value === "string" && PAYMENT_MODES.includes(value as PaymentMode);
}

export function resolvePaymentMode(business: {
  paymentMode?: string | null;
  payAtPickupEnabled?: boolean | null;
}): PaymentMode {
  if (isPaymentMode(business.paymentMode)) return business.paymentMode;
  return business.payAtPickupEnabled ? PaymentModeValues.BOTH : PaymentModeValues.ONLINE_ONLY;
}

export function payAtPickupEnabledFromMode(mode: PaymentMode): boolean {
  return mode === PaymentModeValues.BOTH || mode === PaymentModeValues.PAY_AT_PICKUP_ONLY;
}

export function allowsOnlinePayment(mode: PaymentMode): boolean {
  return mode === PaymentModeValues.ONLINE_ONLY || mode === PaymentModeValues.BOTH;
}

export function allowsPayAtPickup(mode: PaymentMode): boolean {
  return mode === PaymentModeValues.PAY_AT_PICKUP_ONLY || mode === PaymentModeValues.BOTH;
}

export function paymentModeStorefrontNote(mode: PaymentMode): string {
  switch (mode) {
    case PaymentModeValues.ONLINE_ONLY:
      return "Online payment accepted";
    case PaymentModeValues.PAY_AT_PICKUP_ONLY:
      return "Pay at pickup accepted";
    case PaymentModeValues.BOTH:
      return "Online or pay at pickup accepted";
  }
}
