export type RefundStatus = "NONE" | "PARTIAL" | "FULL" | "FAILED";
export type OrderRefundRecordStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED";

export type RefundEligibilityResult =
  | {
      eligible: true;
      orderTotalCents: number;
      refundedAmountCents: number;
      remainingCents: number;
      connectedAccountId: string;
      paymentIntentId: string;
    }
  | { eligible: false; statusCode: number; error: string };

export function orderTotalCents(order: { total: string }): number {
  return Math.round(parseFloat(order.total) * 100);
}

export function computeAggregateRefundStatus(
  orderTotalCents: number,
  refundedAmountCents: number,
  hasFailedAttempt: boolean,
): RefundStatus {
  if (refundedAmountCents <= 0) {
    return hasFailedAttempt ? "FAILED" : "NONE";
  }
  if (refundedAmountCents >= orderTotalCents) {
    return "FULL";
  }
  return "PARTIAL";
}

export function evaluateRefundEligibility(
  order: {
    paymentMethod: string;
    paymentStatus: string;
    total: string;
    refundedAmountCents: number | null;
    refundStatus: RefundStatus | null;
    stripeSessionId: string | null;
    stripeConnectedAccountId: string | null;
    stripePaymentIntentId: string | null;
  },
): RefundEligibilityResult {
  if (order.paymentMethod !== "STRIPE") {
    return {
      eligible: false,
      statusCode: 400,
      error: "Refunds are only available for online card payments.",
    };
  }

  if (order.paymentStatus !== "PAID") {
    return {
      eligible: false,
      statusCode: 400,
      error: "Only paid orders can be refunded.",
    };
  }

  if (order.refundStatus === "FULL") {
    return {
      eligible: false,
      statusCode: 400,
      error: "This order has already been fully refunded.",
    };
  }

  const totalCents = orderTotalCents(order);
  const refundedCents = order.refundedAmountCents ?? 0;
  const remainingCents = totalCents - refundedCents;

  if (remainingCents <= 0) {
    return {
      eligible: false,
      statusCode: 400,
      error: "No refundable amount remains for this order.",
    };
  }

  const connectedAccountId = order.stripeConnectedAccountId;
  if (!connectedAccountId) {
    return {
      eligible: false,
      statusCode: 400,
      error: "This order is missing Stripe connected account information.",
    };
  }

  if (!order.stripeSessionId && !order.stripePaymentIntentId) {
    return {
      eligible: false,
      statusCode: 400,
      error: "This order is missing Stripe payment reference.",
    };
  }

  return {
    eligible: true,
    orderTotalCents: totalCents,
    refundedAmountCents: refundedCents,
    remainingCents,
    connectedAccountId,
    paymentIntentId: order.stripePaymentIntentId ?? "",
  };
}

export function validateRefundAmount(
  amountCents: number,
  remainingCents: number,
): { ok: true } | { ok: false; statusCode: number; error: string } {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return {
      ok: false,
      statusCode: 400,
      error: "Refund amount must be greater than zero.",
    };
  }

  if (amountCents > remainingCents) {
    return {
      ok: false,
      statusCode: 400,
      error: "Refund amount exceeds the remaining refundable amount.",
    };
  }

  return { ok: true };
}

export function mapStripeRefundStatus(
  status: string | null | undefined,
): OrderRefundRecordStatus {
  switch (status) {
    case "succeeded":
      return "SUCCEEDED";
    case "failed":
      return "FAILED";
    case "canceled":
      return "CANCELED";
    case "pending":
    case "requires_action":
    default:
      // Do not treat unknown / in-flight states as succeeded.
      return "PENDING";
  }
}

export function parsePaymentIntentId(
  paymentIntent: string | { id: string } | null | undefined,
): string | null {
  if (!paymentIntent) return null;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}
