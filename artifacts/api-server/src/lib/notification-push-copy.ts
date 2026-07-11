import { formatOrderTicketNumber } from "@workspace/api-zod";
import type { CustomerLifecycleEvent, OrderNotificationData } from "./email-templates/types";
import {
  buildNotificationDeepLinkPath,
} from "./notification-deep-links";

export type PushCopy = {
  title: string;
  body: string;
  deepLink: string;
};

export function buildCustomerOrderPush(
  event: CustomerLifecycleEvent,
  order: OrderNotificationData,
): PushCopy {
  const ticket = formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber);
  const deepLink = buildNotificationDeepLinkPath({
    type: "ORDER",
    orderId: order.orderId,
    audience: "CUSTOMER",
  });

  switch (event) {
    case "ORDER_RECEIVED":
      return {
        title: "Order received",
        body: `${order.businessName} received ${ticket}.`,
        deepLink,
      };
    case "ORDER_ACCEPTED":
      return {
        title: "Order accepted",
        body: `${order.businessName} accepted ${ticket}.`,
        deepLink,
      };
    case "ORDER_PREPARING":
      return {
        title: "Order preparing",
        body: `${ticket} from ${order.businessName} is being prepared.`,
        deepLink,
      };
    case "ORDER_READY_FOR_PICKUP":
      return {
        title: "Ready for pickup",
        body: `${ticket} is ready for pickup at ${order.businessName}.`,
        deepLink,
      };
    case "ORDER_OUT_FOR_DELIVERY":
      return {
        title: "On the way",
        body: `${ticket} from ${order.businessName} is on the way.`,
        deepLink,
      };
    case "ORDER_COMPLETED":
      return {
        title: "Order completed",
        body: `Thanks for ordering from ${order.businessName}!`,
        deepLink,
      };
    case "ORDER_CANCELLED":
      return {
        title: "Order cancelled",
        body: `${ticket} from ${order.businessName} was cancelled.`,
        deepLink,
      };
  }
}

export function buildOwnerNewOrderPush(order: OrderNotificationData): PushCopy {
  return {
    title: "New order",
    body: `${formatOrderTicketNumber(order.orderId, "Order", order.businessOrderNumber)} · ${order.customerName} · $${order.total.toFixed(2)}`,
    deepLink: buildNotificationDeepLinkPath({
      type: "ORDER",
      orderId: order.orderId,
      audience: "OWNER",
    }),
  };
}

export function buildOwnerNewAppointmentPush(input: {
  businessName: string;
  customerName: string;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
}): PushCopy {
  const service = input.serviceName ? ` · ${input.serviceName}` : "";
  return {
    title: "New appointment request",
    body: `${input.customerName}${service} · ${input.requestedDate} ${input.requestedTime}`,
    deepLink: buildNotificationDeepLinkPath({ type: "APPOINTMENTS", audience: "OWNER" }),
  };
}

export function buildCustomerAppointmentPush(input: {
  businessName: string;
  status: "CONFIRMED" | "DECLINED";
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
}): PushCopy {
  const service = input.serviceName ? ` (${input.serviceName})` : "";
  if (input.status === "CONFIRMED") {
    return {
      title: "Appointment confirmed",
      body: `${input.businessName} confirmed your appointment${service} for ${input.requestedDate} ${input.requestedTime}.`,
      deepLink: "/my-orders",
    };
  }
  return {
    title: "Appointment declined",
    body: `${input.businessName} could not confirm your appointment for ${input.requestedDate} ${input.requestedTime}.`,
    deepLink: "/my-orders",
  };
}

export function buildAdminApplicationPush(input: {
  businessName: string;
  applicationId: number;
}): PushCopy {
  return {
    title: "New business application",
    body: `${input.businessName} applied to join TownHub.`,
    deepLink: buildNotificationDeepLinkPath({ type: "ADMIN_APPLICATIONS" }),
  };
}
