import { db, notificationLogsTable } from "@workspace/db";
import { logger } from "./logger";

export type NotificationType =
  | "ORDER_PLACED_BUSINESS"
  | "ORDER_PLACED_CUSTOMER"
  | "ORDER_STATUS_UPDATE";

export interface OrderNotificationPayload {
  type: NotificationType;
  businessId: number;
  orderId: number;
  recipientEmail: string;
  subject: string;
  body: string;
}

// ─── Provider stub ───────────────────────────────────────────────────────────
// Replace this function body to integrate a real provider (e.g. Resend, SMTP).
// Return true if the email was actually sent, false if no provider is configured.
async function sendViaProvider(
  _email: string,
  _subject: string,
  _body: string,
): Promise<boolean> {
  // Example Resend integration (uncomment when RESEND_API_KEY is set):
  // const { Resend } = await import("resend");
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: "orders@yourdomain.com", to: _email, subject: _subject, text: _body });
  // return true;

  if (process.env.RESEND_API_KEY || process.env.SMTP_HOST) {
    // Provider key present but not yet wired — log a warning
    logger.warn("Email provider env vars found but no sender is configured. Wire sendViaProvider() in notifications.ts.");
  }
  return false;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send (or log) a single notification. Never throws — failures are logged.
 */
export async function sendOrderNotification(
  payload: OrderNotificationPayload,
): Promise<void> {
  const { type, businessId, orderId, recipientEmail, subject, body } = payload;
  let status: "SENT" | "LOGGED" | "FAILED" = "LOGGED";

  try {
    const sent = await sendViaProvider(recipientEmail, subject, body);
    status = sent ? "SENT" : "LOGGED";

    if (!sent) {
      logger.info(
        { type, orderId, recipientEmail, subject },
        `[NOTIFICATION LOG] ${type} → ${recipientEmail}`,
      );
    }
  } catch (err) {
    status = "FAILED";
    logger.error({ err, type, orderId, recipientEmail }, "Notification send failed");
  }

  // Always persist to notification_logs for dev inspection
  try {
    await db.insert(notificationLogsTable).values({
      businessId,
      orderId,
      type,
      recipientEmail,
      subject,
      body,
      status,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write notification log to DB");
  }
}

// ─── Email template builders ─────────────────────────────────────────────────

export function buildOrderPlacedBusinessEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  fulfillmentType: string;
  notes?: string | null;
}): { subject: string; body: string } {
  const subject = `New order ${order.orderNumber} from ${order.customerName}`;
  const itemLines = order.items
    .map((i) => `  - ${i.productName} x${i.quantity} @ $${i.unitPrice.toFixed(2)}`)
    .join("\n");
  const body = [
    `A new order has been placed!`,
    ``,
    `Order #: ${order.orderNumber}`,
    `Customer: ${order.customerName} <${order.customerEmail}>`,
    `Fulfillment: ${order.fulfillmentType}`,
    `Total: $${order.total.toFixed(2)}`,
    ``,
    `Items:`,
    itemLines,
    order.notes ? `\nCustomer notes: ${order.notes}` : "",
    ``,
    `Log in to your dashboard to confirm and prepare this order.`,
  ].join("\n");
  return { subject, body };
}

export function buildOrderConfirmationEmail(order: {
  orderNumber: string;
  businessName: string;
  total: number;
  items: Array<{ productName: string; quantity: number }>;
  fulfillmentType: string;
  customerName: string;
}): { subject: string; body: string } {
  const subject = `Your order ${order.orderNumber} is confirmed — ${order.businessName}`;
  const itemLines = order.items
    .map((i) => `  - ${i.productName} x${i.quantity}`)
    .join("\n");
  const body = [
    `Hi ${order.customerName},`,
    ``,
    `Thanks for your order from ${order.businessName}!`,
    ``,
    `Order #: ${order.orderNumber}`,
    `Fulfillment: ${order.fulfillmentType}`,
    `Total: $${order.total.toFixed(2)}`,
    ``,
    `Items:`,
    itemLines,
    ``,
    `We'll send you another update when your order status changes.`,
    `Thank you for supporting local!`,
  ].join("\n");
  return { subject, body };
}

export function buildStatusUpdateEmail(order: {
  orderNumber: string;
  businessName: string;
  status: string;
  customerName: string;
}): { subject: string; body: string } {
  const statusMessages: Record<string, string> = {
    CONFIRMED: "has been confirmed",
    PREPARING: "is being prepared",
    READY_FOR_PICKUP: "is ready for pickup — come pick it up!",
    OUT_FOR_DELIVERY: "is out for delivery",
    COMPLETED: "has been completed",
    CANCELED: "has been canceled",
  };
  const msg = statusMessages[order.status] ?? `status changed to ${order.status}`;
  const subject = `Order ${order.orderNumber} ${msg}`;
  const body = [
    `Hi ${order.customerName},`,
    ``,
    `Your order ${order.orderNumber} from ${order.businessName} ${msg}.`,
    ``,
    `Thank you for supporting local!`,
  ].join("\n");
  return { subject, body };
}
