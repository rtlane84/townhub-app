import type { Order, RefundStatus } from "@workspace/api-client-react";

export function formatRefundAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatRefundAmountCents(amountCents: number): string {
  return formatRefundAmount(amountCents / 100);
}

export function orderPaymentDisplayStatus(order: Pick<Order, "paymentMethod" | "paymentStatus" | "refundStatus" | "refundedAmount">): string {
  if (order.paymentMethod === "IN_PERSON") {
    return "Pay at pickup/delivery";
  }

  if (order.refundStatus === "FULL") {
    return "Fully refunded";
  }

  if (order.refundStatus === "PARTIAL" && order.refundedAmount != null) {
    return `Partially refunded (${formatRefundAmount(order.refundedAmount)} refunded)`;
  }

  if (order.refundStatus === "FAILED") {
    return "Refund failed";
  }

  if (order.paymentStatus === "PAID") {
    return "Paid";
  }

  if (order.paymentMethod === "STRIPE") {
    return "Payment processing";
  }

  return "Card";
}

export function customerRefundSummary(order: Pick<Order, "refundStatus" | "refundedAmount">): string | null {
  if (order.refundStatus === "FULL") {
    return "Refunded: full amount refunded";
  }

  if (order.refundStatus === "PARTIAL" && order.refundedAmount != null) {
    return `Partially refunded: ${formatRefundAmount(order.refundedAmount)} refunded`;
  }

  return null;
}

export function canIssueRefund(order: Pick<
  Order,
  "paymentMethod" | "paymentStatus" | "refundStatus" | "refundableAmount"
>): boolean {
  if (order.paymentMethod !== "STRIPE") return false;
  if (order.paymentStatus !== "PAID") return false;
  if (order.refundStatus === "FULL") return false;
  return (order.refundableAmount ?? 0) > 0;
}

export function refundStatusLabel(status: RefundStatus | undefined): string {
  switch (status) {
    case "PARTIAL":
      return "Partially refunded";
    case "FULL":
      return "Fully refunded";
    case "FAILED":
      return "Refund failed";
    case "NONE":
    default:
      return "Paid";
  }
}

export function refundRecordStatusLabel(status: string): string {
  switch (status) {
    case "SUCCEEDED":
      return "Succeeded";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "CANCELED":
      return "Canceled";
    default:
      return status;
  }
}
