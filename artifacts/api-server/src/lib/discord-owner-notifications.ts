import type { OrderNotificationData } from "./email-templates/types";
import { dashboardAppointmentsUrl, dashboardOrderUrl } from "./notification-urls";
import {
  formatOrderReferenceLabel,
  formatOrderTicketNumber,
  formatTime12h,
} from "@workspace/api-zod";
import { postDiscordWebhook } from "./discord-webhook";

const ORDER_EMBED_COLOR = 0x2563eb;

function fulfillmentLabel(type: string): string {
  return type === "DELIVERY" ? "Delivery" : "Pickup";
}

export function buildOwnerNewOrderDiscordPayload(order: OrderNotificationData) {
  const orderUrl = dashboardOrderUrl(order.orderId);
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "Order", value: formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber), inline: true },
    { name: "Customer", value: order.customerName, inline: true },
    { name: "Total", value: `$${order.total.toFixed(2)}`, inline: true },
    { name: "Fulfillment", value: fulfillmentLabel(order.fulfillmentType), inline: true },
  ];
  const reference = formatOrderReferenceLabel(order.orderNumber);
  if (reference) {
    fields.push({ name: "Reference", value: reference.replace(/^Reference: /, ""), inline: true });
  }
  fields.push({ name: "Open in TownHub", value: orderUrl });

  return {
    embeds: [
      {
        title: "New order",
        description: `**${order.businessName}** received a new order.`,
        url: orderUrl,
        color: ORDER_EMBED_COLOR,
        fields,
      },
    ],
  };
}

export function buildOwnerNewAppointmentDiscordPayload(input: {
  businessName: string;
  customerName: string;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
}) {
  const url = dashboardAppointmentsUrl();
  const when = `${input.requestedDate} at ${formatTime12h(input.requestedTime)}`;
  return {
    embeds: [
      {
        title: "New appointment request",
        description: `**${input.businessName}** received a new appointment request.`,
        url,
        color: ORDER_EMBED_COLOR,
        fields: [
          { name: "Customer", value: input.customerName, inline: true },
          { name: "Service", value: input.serviceName?.trim() || "General request", inline: true },
          { name: "When", value: when, inline: false },
          { name: "Open in TownHub", value: url },
        ],
      },
    ],
  };
}

export function buildOwnerDiscordTestPayload(businessName: string) {
  return {
    embeds: [
      {
        title: "TownHub test notification",
        description: `Discord alerts are configured for **${businessName}**.`,
        color: ORDER_EMBED_COLOR,
        fields: [{ name: "Status", value: "This is a test message from TownHub." }],
      },
    ],
  };
}

export async function sendOwnerDiscordWebhook(input: {
  webhookUrl: string;
  payload: {
    embeds: Array<{
      title?: string;
      description?: string;
      url?: string;
      color?: number;
      fields?: Array<{ name: string; value: string; inline?: boolean }>;
    }>;
  };
}): Promise<{ sent: boolean; error?: string }> {
  const result = await postDiscordWebhook({
    webhookUrl: input.webhookUrl,
    embeds: input.payload.embeds as NonNullable<Parameters<typeof postDiscordWebhook>[0]["embeds"]>,
  });
  if (!result.ok) return { sent: false, error: result.error };
  return { sent: true };
}
