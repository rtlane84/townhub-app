import {
  type PaymentMode,
  isPaymentMode,
  payAtPickupEnabledFromMode,
  resolvePaymentMode,
  allowsOnlinePayment,
  allowsPayAtPickup,
} from "@workspace/api-zod";

export function applyPaymentModeToUpdate(
  updateData: Record<string, unknown>,
  input: { paymentMode?: unknown; payAtPickupEnabled?: boolean },
): void {
  if (input.paymentMode !== undefined && input.paymentMode !== null) {
    if (isPaymentMode(input.paymentMode)) {
      updateData.paymentMode = input.paymentMode;
      updateData.payAtPickupEnabled = payAtPickupEnabledFromMode(input.paymentMode);
      return;
    }
    // Ignore invalid explicit values; fall through to payAtPickupEnabled if provided.
  }

  if (input.payAtPickupEnabled !== undefined) {
    updateData.payAtPickupEnabled = input.payAtPickupEnabled;
    updateData.paymentMode = input.payAtPickupEnabled ? "BOTH" : "ONLINE_ONLY";
  }
}

export function paymentModeForInsert(input: {
  paymentMode?: unknown;
  payAtPickupEnabled?: boolean;
}): { paymentMode: PaymentMode; payAtPickupEnabled: boolean } {
  if (input.paymentMode !== undefined && isPaymentMode(input.paymentMode)) {
    return {
      paymentMode: input.paymentMode,
      payAtPickupEnabled: payAtPickupEnabledFromMode(input.paymentMode),
    };
  }
  const payAtPickupEnabled = input.payAtPickupEnabled ?? false;
  return {
    paymentMode: payAtPickupEnabled ? "BOTH" : "ONLINE_ONLY",
    payAtPickupEnabled,
  };
}

export function validatePaymentMethodForBusiness(
  business: { paymentMode?: string | null; payAtPickupEnabled?: boolean | null },
  paymentMethod: string,
): string | null {
  const mode = resolvePaymentMode(business);
  if (paymentMethod === "IN_PERSON") {
    if (!allowsPayAtPickup(mode)) {
      return "This business does not accept pay-at-pickup orders.";
    }
    return null;
  }
  if (!allowsOnlinePayment(mode)) {
    return "This business does not accept online card payments.";
  }
  return null;
}
