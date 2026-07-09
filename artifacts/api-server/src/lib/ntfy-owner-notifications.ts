import type { OrderNotificationData } from "./email-templates/types";
import { dashboardAppointmentsUrl, dashboardOrderUrl } from "./notification-urls";
import {
  formatOrderReferenceLabel,
  formatOrderTicketNumber,
  formatTime12h,
} from "@workspace/api-zod";
import { postNtfyNotification } from "./ntfy-provider";

function fulfillmentLabel(type: string): string {
  return type === "DELIVERY" ? "Delivery" : "Pickup";
}

export function buildOwnerNewOrderNtfyMessage(order: OrderNotificationData) {
  const orderUrl = dashboardOrderUrl(order.orderId);
  const ticketLabel = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  const messageLines = [
    "**New Order**",
    order.businessName,
    ticketLabel,
    fulfillmentLabel(order.fulfillmentType),
    `$${order.total.toFixed(2)}`,
    `Customer: ${order.customerName}`,
  ];
  const reference = formatOrderReferenceLabel(order.orderNumber);
  if (reference) {
    messageLines.push(reference);
  }
  messageLines.push(`Open in TownHub: ${orderUrl}`);
  return {
    title: "New order",
    message: messageLines.join("\n"),
    click: orderUrl,
    tags: ["shopping_cart"],
  };
}

export function buildOwnerNewAppointmentNtfyMessage(input: {
  businessName: string;
  customerName: string;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
}) {
  const url = dashboardAppointmentsUrl();
  const when = `${input.requestedDate} at ${formatTime12h(input.requestedTime)}`;
  const service = input.serviceName?.trim() || "General request";
  const message = [
    `**${input.businessName}** received a new appointment request.`,
    "",
    `Customer: ${input.customerName}`,
    `Service: ${service}`,
    `When: ${when}`,
    `Open in TownHub: ${url}`,
  ].join("\n");
  return {
    title: "New appointment request",
    message,
    click: url,
    tags: ["calendar"],
  };
}

export function buildOwnerNtfyTestMessage(businessName: string) {
  return {
    title: "TownHub test notification",
    message: [
      `Phone alerts are configured for **${businessName}**.`,
      "",
      "Status: This is a test message from TownHub.",
    ].join("\n"),
    tags: ["white_check_mark"],
  };
}

export async function sendOwnerNtfyNotification(input: {
  topic: string;
  title: string;
  message: string;
  click?: string;
  tags?: string[];
}): Promise<{ sent: boolean; error?: string }> {
  const result = await postNtfyNotification(input);
  if (!result.ok) return { sent: false, error: result.error };
  return { sent: true };
}
