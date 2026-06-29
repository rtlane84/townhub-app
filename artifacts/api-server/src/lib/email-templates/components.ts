import { escapeHtml, BORDER_COLOR, MUTED_COLOR, ACCENT_COLOR } from "./layout";
import type { OrderItemLine } from "./types";

export function renderButton(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:${ACCENT_COLOR};color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 28px;border-radius:10px;">${escapeHtml(label)}</a>`;
}

export function renderStatusBadge(label: string, tone: "neutral" | "success" | "warning" | "danger" = "neutral"): string {
  const colors = {
    neutral: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    success: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
    warning: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
    danger: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  }[tone];

  return `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${colors.bg};color:${colors.text};border:1px solid ${colors.border};font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(label)}</span>`;
}

export function renderDetailTable(rows: Array<{ label: string; value: string }>): string {
  const rowHtml = rows
    .filter((row) => row.value.trim())
    .map(
      (row) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER_COLOR};font-size:13px;color:${MUTED_COLOR};width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER_COLOR};font-size:15px;color:#0f172a;font-weight:600;vertical-align:top;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border-collapse:collapse;">${rowHtml}</table>`;
}

export function renderOrderItems(items: OrderItemLine[], total: number): string {
  const lines = items
    .map(
      (item) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER_COLOR};font-size:15px;color:#0f172a;">${escapeHtml(item.productName)}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER_COLOR};font-size:14px;color:${MUTED_COLOR};text-align:center;">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER_COLOR};font-size:15px;color:#0f172a;text-align:right;font-weight:600;">$${((item.unitPrice ?? 0) * item.quantity).toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  return `<div style="margin:24px 0;padding:20px;background:#f8fafc;border:1px solid ${BORDER_COLOR};border-radius:12px;">
    <div style="font-size:13px;font-weight:700;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Order Items</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      ${lines}
      <tr>
        <td colspan="2" style="padding:16px 0 0;font-size:15px;font-weight:700;color:#0f172a;">Total</td>
        <td style="padding:16px 0 0;font-size:18px;font-weight:700;color:#0f172a;text-align:right;">$${total.toFixed(2)}</td>
      </tr>
    </table>
  </div>`;
}

export function fulfillmentLabel(type: string): string {
  if (type === "PICKUP") return "Pickup";
  if (type === "DELIVERY") return "Delivery";
  return type;
}

export function paymentMethodLabel(paymentMethod: string): string {
  return paymentMethod === "IN_PERSON" ? "Pay at pickup/delivery" : "Online card payment";
}

export function paymentStatusLabel(paymentMethod: string, paymentStatus: string): string {
  if (paymentMethod === "IN_PERSON") return "Pay at pickup/delivery";
  if (paymentStatus === "PAID") return "Paid";
  return "Payment processing";
}

export function formatOrderDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function pickupLocationLabel(order: {
  businessAddress?: string | null;
  pickupInstructions?: string | null;
}): string {
  const parts = [order.businessAddress?.trim(), order.pickupInstructions?.trim()].filter(Boolean);
  return parts.join(" · ") || "See order details for pickup location";
}
