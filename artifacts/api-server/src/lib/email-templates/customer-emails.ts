import { customerOrderUrlForNotification } from "../notification-urls";
import {
  formatOrderDateTime,
  fulfillmentLabel,
  pickupLocationLabel,
  renderDetailTable,
  renderOrderItems,
  renderStatusBadge,
} from "./components";
import {
  formatNotificationEstimatedWindow,
  formatOrderReferenceLabel,
  formatOrderReferenceNumber,
  formatOrderTicketNumber,
} from "@workspace/api-zod";
import { escapeHtml, renderEmailLayout, renderParagraph } from "./layout";
import type { CustomerLifecycleEvent, EmailContent, OrderNotificationData } from "./types";
import { formatOrderTotalsTextLines, orderTotalsSummaryFromNotification } from "./types";

function orderSummaryRows(order: OrderNotificationData): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Business", value: order.businessName },
    { label: "Order", value: formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber) },
  ];
  const reference = formatOrderReferenceNumber(order.orderNumber);
  if (reference) {
    rows.push({ label: "Reference", value: reference });
  }
  rows.push(
    { label: "Order placed", value: formatOrderDateTime(order.orderedAt, order.timeZone) },
    { label: "Fulfillment", value: fulfillmentLabel(order.fulfillmentType) },
  );

  if (order.estimatedWindowStart && order.estimatedWindowEnd) {
    rows.push({
      label: "Timing",
      value: formatNotificationEstimatedWindow(
        order.fulfillmentType,
        order.estimatedWindowStart,
        order.estimatedWindowEnd,
        order.timeZone,
      ),
    });
  }

  return rows;
}

function orderSummaryHtml(order: OrderNotificationData, includeItems = true): string {
  const itemsBlock = includeItems
    ? renderOrderItems(order.items, orderTotalsSummaryFromNotification(order))
    : "";
  return `${renderDetailTable(orderSummaryRows(order))}${itemsBlock}`;
}

function buildEmail(
  order: OrderNotificationData,
  config: {
    subject: string;
    preheader: string;
    heading: string;
    introParagraphs: string[];
    extraHtml?: string;
    actionLabel?: string;
    footerNote?: string;
    includeItems?: boolean;
    badge?: { label: string; tone: "neutral" | "success" | "warning" | "danger" };
  },
): EmailContent {
  const greeting = `Hi ${order.customerName},`;
  const introHtml = [renderParagraph(`${escapeHtml(greeting)}`), ...config.introParagraphs.map(renderParagraph)].join("");
  const badgeHtml = config.badge
    ? `<div style="text-align:center;margin-bottom:20px;">${renderStatusBadge(config.badge.label, config.badge.tone)}</div>`
    : "";
  const summaryHtml = orderSummaryHtml(order, config.includeItems ?? false);
  const bodyHtml = `${badgeHtml}${introHtml}${config.extraHtml ?? ""}${summaryHtml}`;
  const orderUrl = customerOrderUrlForNotification(order);

  const html = renderEmailLayout({
    preheader: config.preheader,
    businessName: order.businessName,
    businessLogoUrl: order.businessLogoUrl,
    heading: config.heading,
    bodyHtml,
    actionLabel: config.actionLabel ?? "View Order",
    actionUrl: orderUrl,
    footerNote: config.footerNote,
  });

  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  const referenceLine = formatOrderReferenceLabel(order.orderNumber);
  const textLines = [
    greeting,
    "",
    ...config.introParagraphs.map((p) => p.replace(/<[^>]+>/g, "")),
    "",
    `Business: ${order.businessName}`,
    `Order: ${ticketLabel}`,
    referenceLine,
    `Placed: ${formatOrderDateTime(order.orderedAt, order.timeZone)}`,
    `Fulfillment: ${fulfillmentLabel(order.fulfillmentType)}`,
  ].filter(Boolean) as string[];

  if (order.estimatedWindowStart && order.estimatedWindowEnd) {
    textLines.push(
      formatNotificationEstimatedWindow(
        order.fulfillmentType,
        order.estimatedWindowStart,
        order.estimatedWindowEnd,
        order.timeZone,
      ),
    );
  }

  textLines.push(
    ...formatOrderTotalsTextLines(orderTotalsSummaryFromNotification(order)),
    "",
    `${config.actionLabel ?? "View Order"}: ${orderUrl}`,
  );

  if (config.footerNote) {
    textLines.push("", config.footerNote);
  }

  return { subject: config.subject, text: textLines.join("\n"), html };
}

export function buildCustomerOrderReceivedEmail(order: OrderNotificationData): EmailContent {
  const business = escapeHtml(order.businessName);
  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  return buildEmail(order, {
    subject: "We received your order",
    preheader: `${order.businessName} received ${ticketLabel}.`,
    heading: "We received your order",
    introParagraphs: [
      `Thank you for ordering from ${business}.`,
      `${business} has received your order and is reviewing it now.`,
      `We'll send you another update as soon as the business accepts your order.`,
    ],
    includeItems: true,
    badge: { label: "Order received", tone: "neutral" },
    footerNote: "Questions about your order? Reply to this email or contact the business directly.",
  });
}

export function buildCustomerOrderAcceptedEmail(order: OrderNotificationData): EmailContent {
  const business = escapeHtml(order.businessName);
  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  return buildEmail(order, {
    subject: `${order.businessName} accepted your order`,
    preheader: `${order.businessName} accepted ${ticketLabel}.`,
    heading: `${order.businessName} accepted your order`,
    introParagraphs: [
      `Good news — ${business} accepted ${ticketLabel}.`,
      `They're getting started and will begin preparing it soon.`,
    ],
    includeItems: false,
    badge: { label: "Accepted", tone: "success" },
  });
}

export function buildCustomerOrderPreparingEmail(order: OrderNotificationData): EmailContent {
  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  return buildEmail(order, {
    subject: "Your order is being prepared",
    preheader: `${order.businessName} is preparing ${ticketLabel}.`,
    heading: "Your order is being prepared",
    introParagraphs: [
      `${escapeHtml(order.businessName)} is actively preparing your order right now.`,
      `We'll let you know when it's ready for the next step.`,
    ],
    includeItems: false,
    badge: { label: "Preparing", tone: "warning" },
  });
}

export function buildCustomerOrderReadyEmail(order: OrderNotificationData): EmailContent {
  const pickup = pickupLocationLabel(order);
  const extraHtml =
    order.fulfillmentType === "PICKUP"
      ? renderDetailTable([{ label: "Pickup location", value: pickup }])
      : "";

  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  return buildEmail(order, {
    subject: "Your order is ready for pickup",
    preheader: `${ticketLabel} is ready for pickup at ${order.businessName}.`,
    heading: "Your order is ready for pickup!",
    introParagraphs: [
      `Your order from ${escapeHtml(order.businessName)} is ready — come pick it up when you can.`,
    ],
    extraHtml,
    includeItems: false,
    badge: { label: "Ready for pickup", tone: "success" },
  });
}

export function buildCustomerOrderOutForDeliveryEmail(order: OrderNotificationData): EmailContent {
  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  return buildEmail(order, {
    subject: "Your order is on the way",
    preheader: `${ticketLabel} from ${order.businessName} is on the way.`,
    heading: "Your order is on the way",
    introParagraphs: [
      `${escapeHtml(order.businessName)} has sent your order out for delivery.`,
      `Track your order details anytime using the link below.`,
    ],
    includeItems: false,
    badge: { label: "Out for delivery", tone: "success" },
    actionLabel: "Track Order",
  });
}

export function buildCustomerOrderCompletedEmail(order: OrderNotificationData): EmailContent {
  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  return buildEmail(order, {
    subject: `Thanks for ordering from ${order.businessName}`,
    preheader: `Thanks for ${ticketLabel}.`,
    heading: "Thanks for your order!",
    introParagraphs: [
      `We hope you enjoyed your order from ${escapeHtml(order.businessName)}.`,
      `We'd love to see you again soon.`,
    ],
    includeItems: false,
    badge: { label: "Completed", tone: "success" },
    footerNote: "Thank you for supporting local businesses through TownHub.",
  });
}

export function buildCustomerOrderRefundEmail(
  order: OrderNotificationData,
  refundAmountCents: number,
): EmailContent {
  const refundAmount = (refundAmountCents / 100).toFixed(2);
  const timingNote =
    "Refunds are returned to your original payment method. Depending on your bank, it may take 5–10 business days to appear on your statement.";

  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  const referenceLabel = formatOrderReferenceLabel(order.orderNumber);

  return buildEmail(order, {
    subject: `Refund issued for ${ticketLabel}`,
    preheader: `${order.businessName} issued a $${refundAmount} refund for ${ticketLabel}.`,
    heading: "Your refund is on the way",
    introParagraphs: [
      `${escapeHtml(order.businessName)} issued a refund of $${refundAmount} for ${ticketLabel}.${referenceLabel ? ` (${referenceLabel})` : ""}`,
      timingNote,
    ],
    includeItems: false,
    badge: { label: "Refund issued", tone: "success" },
    footerNote: timingNote,
  });
}

export function buildCustomerOrderCancelledEmail(order: OrderNotificationData): EmailContent {
  const refundNote =
    order.paymentMethod === "STRIPE" && order.paymentStatus === "PAID"
      ? "If you were charged, a refund will be processed. Please allow 5–10 business days for it to appear on your statement."
      : undefined;

  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  const intro = [
    `We're sorry — ${escapeHtml(order.businessName)} had to cancel ${ticketLabel}.`,
    refundNote ?? "If you have questions, please contact the business directly.",
  ];

  return buildEmail(order, {
    subject: "Your order was cancelled",
    preheader: `${ticketLabel} from ${order.businessName} was cancelled.`,
    heading: "Your order was cancelled",
    introParagraphs: intro,
    includeItems: false,
    badge: { label: "Cancelled", tone: "danger" },
    footerNote: refundNote,
  });
}

export function buildCustomerLifecycleEmail(
  event: CustomerLifecycleEvent,
  order: OrderNotificationData,
): EmailContent {
  switch (event) {
    case "ORDER_RECEIVED":
      return buildCustomerOrderReceivedEmail(order);
    case "ORDER_ACCEPTED":
      return buildCustomerOrderAcceptedEmail(order);
    case "ORDER_PREPARING":
      return buildCustomerOrderPreparingEmail(order);
    case "ORDER_READY_FOR_PICKUP":
      return buildCustomerOrderReadyEmail(order);
    case "ORDER_OUT_FOR_DELIVERY":
      return buildCustomerOrderOutForDeliveryEmail(order);
    case "ORDER_COMPLETED":
      return buildCustomerOrderCompletedEmail(order);
    case "ORDER_CANCELLED":
      return buildCustomerOrderCancelledEmail(order);
  }
}
