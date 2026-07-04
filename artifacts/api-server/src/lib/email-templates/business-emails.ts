import { dashboardOrderUrl } from "../notification-urls";
import { formatNotificationEstimatedWindow } from "@workspace/api-zod";
import {
  formatOrderDateTime,
  fulfillmentLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  renderDetailTable,
  renderOrderItems,
} from "./components";
import { renderEmailLayout } from "./layout";
import type { EmailContent, OrderNotificationData } from "./types";
import { formatOrderTotalsTextLines, orderTotalsSummaryFromNotification } from "./types";

export function buildOwnerNewOrderEmail(order: OrderNotificationData): EmailContent {
  const openUrl = dashboardOrderUrl(order.orderId);

  const detailRows = [
    { label: "Order number", value: order.orderNumber },
    { label: "Customer", value: order.customerName },
    { label: "Phone", value: order.customerPhone?.trim() ?? "—" },
    { label: "Email", value: order.customerEmail?.trim() ?? "—" },
    { label: "Payment method", value: paymentMethodLabel(order.paymentMethod) },
    { label: "Payment status", value: paymentStatusLabel(order.paymentMethod, order.paymentStatus) },
    { label: "Fulfillment", value: fulfillmentLabel(order.fulfillmentType) },
    { label: "Order placed", value: formatOrderDateTime(order.orderedAt) },
  ];

  if (order.estimatedWindowStart && order.estimatedWindowEnd) {
    detailRows.push({
      label: "Estimated ready",
      value: formatNotificationEstimatedWindow(
        order.fulfillmentType,
        order.estimatedWindowStart,
        order.estimatedWindowEnd,
      ),
    });
  }

  const bodyHtml = `${renderDetailTable(detailRows)}${renderOrderItems(order.items, orderTotalsSummaryFromNotification(order))}`;

  const html = renderEmailLayout({
    preheader: `New order ${order.orderNumber} from ${order.customerName}.`,
    businessName: order.businessName,
    businessLogoUrl: order.businessLogoUrl,
    heading: "New Order Received",
    bodyHtml,
    actionLabel: "Open Order",
    actionUrl: openUrl,
  });

  const itemLines = order.items.map((i) => `  - ${i.productName} x${i.quantity}`).join("\n");
  const text = [
    "New Order Received",
    "",
    `Business: ${order.businessName}`,
    `Order #: ${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    order.customerPhone ? `Phone: ${order.customerPhone}` : "",
    order.customerEmail ? `Email: ${order.customerEmail}` : "",
    `Payment: ${paymentMethodLabel(order.paymentMethod)} (${paymentStatusLabel(order.paymentMethod, order.paymentStatus)})`,
    `Fulfillment: ${fulfillmentLabel(order.fulfillmentType)}`,
    order.estimatedWindowStart && order.estimatedWindowEnd
      ? formatNotificationEstimatedWindow(
          order.fulfillmentType,
          order.estimatedWindowStart,
          order.estimatedWindowEnd,
        )
      : "",
    ...formatOrderTotalsTextLines(orderTotalsSummaryFromNotification(order)),
    "",
    "Items:",
    itemLines,
    "",
    `Open Order: ${openUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `New order ${order.orderNumber} — ${order.businessName}`,
    text,
    html,
  };
}

export function buildOwnerRefundFailedEmail(
  order: OrderNotificationData,
  refundAmountCents: number,
): EmailContent {
  const openUrl = dashboardOrderUrl(order.orderId);
  const refundAmount = (refundAmountCents / 100).toFixed(2);

  const bodyHtml = renderDetailTable([
    { label: "Order number", value: order.orderNumber },
    { label: "Customer", value: order.customerName },
    { label: "Refund amount", value: `$${refundAmount}` },
  ]);

  const html = renderEmailLayout({
    preheader: `Refund failed for order ${order.orderNumber}.`,
    businessName: order.businessName,
    businessLogoUrl: order.businessLogoUrl,
    heading: "Refund failed",
    bodyHtml,
    actionLabel: "Review Order",
    actionUrl: openUrl,
    footerNote: "Stripe could not process this refund. Review the order in your dashboard and try again, or contact support.",
  });

  const text = [
    "Refund failed",
    "",
    `Order #: ${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Refund amount: $${refundAmount}`,
    "",
    `Review Order: ${openUrl}`,
  ].join("\n");

  return {
    subject: `Refund failed for order ${order.orderNumber}`,
    text,
    html,
  };
}
