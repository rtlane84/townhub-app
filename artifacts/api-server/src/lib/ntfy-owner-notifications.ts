import type { OrderNotificationData } from "./email-templates/types";
import { dashboardAppointmentsUrl, dashboardOrderUrl } from "./notification-urls";
import { formatTime12h } from "@workspace/api-zod";
import { postNtfyNotification } from "./ntfy-provider";

function fulfillmentLabel(type: string): string {
  return type === "DELIVERY" ? "Delivery" : "Pickup";
}

export function buildOwnerNewOrderNtfyMessage(order: OrderNotificationData) {
  const orderUrl = dashboardOrderUrl(order.orderId);
  const message = [
    `**${order.businessName}** received a new order.`,
    "",
    `Order: ${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Total: $${order.total.toFixed(2)}`,
    `Fulfillment: ${fulfillmentLabel(order.fulfillmentType)}`,
    `Open in TownHub: ${orderUrl}`,
  ].join("\n");
  return {
    title: "New order",
    message,
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
