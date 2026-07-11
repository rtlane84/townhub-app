import { formatOrderStatusForDisplay } from "./order-status-safety";

export type ConfirmActionCopy = {
  title: string;
  body: string[];
  confirmLabel: string;
  destructive?: boolean;
};

export function deleteItemCopy(itemName: string): ConfirmActionCopy {
  return {
    title: "Delete item?",
    body: [
      `"${itemName}" will immediately disappear from your storefront.`,
      "This action cannot be undone.",
    ],
    confirmLabel: "Delete item",
    destructive: true,
  };
}

export function deleteCategoryCopy(categoryName: string): ConfirmActionCopy {
  return {
    title: "Delete category?",
    body: [
      `"${categoryName}" will be removed from your storefront.`,
      "Items in this category are not deleted, but they will no longer be grouped under it.",
      "This action cannot be undone.",
    ],
    confirmLabel: "Delete category",
    destructive: true,
  };
}

export function deleteItemOptionGroupCopy(groupName: string): ConfirmActionCopy {
  return {
    title: "Delete item option group?",
    body: [
      `"${groupName}" will be removed and can no longer be attached to items.`,
      "Items already using this group may need to be updated.",
      "This action cannot be undone.",
    ],
    confirmLabel: "Delete option group",
    destructive: true,
  };
}

export function deleteLocationCopy(locationName: string): ConfirmActionCopy {
  return {
    title: "Delete location?",
    body: [
      `"${locationName}" will be removed from your location schedule.`,
      "Customers will no longer see this stop on your storefront or the homepage food truck list.",
      "This action cannot be undone.",
    ],
    confirmLabel: "Delete location",
    destructive: true,
  };
}

export function confirmAppointmentCopy(customerName: string, dateLabel: string): ConfirmActionCopy {
  return {
    title: "Confirm appointment?",
    body: [
      `Confirm the appointment for ${customerName} on ${dateLabel}.`,
      "The customer will be emailed if they provided an email address.",
      "You can still cancel or mark it complete later.",
    ],
    confirmLabel: "Confirm appointment",
  };
}

export function cancelAppointmentCopy(customerName: string): ConfirmActionCopy {
  return {
    title: "Cancel appointment?",
    body: [
      `Cancel the appointment for ${customerName}.`,
      "The customer will be emailed if they provided an email address.",
      "This action cannot be undone.",
    ],
    confirmLabel: "Cancel appointment",
    destructive: true,
  };
}

export function completeAppointmentCopy(customerName: string): ConfirmActionCopy {
  return {
    title: "Mark appointment complete?",
    body: [
      `Mark ${customerName}'s appointment as completed.`,
      "The customer is not emailed for this change.",
      "You can review completed appointments in your history.",
    ],
    confirmLabel: "Mark complete",
  };
}

export function changeOrderStatusCopy(
  orderLabel: string,
  nextStatus: string,
): ConfirmActionCopy {
  const label = formatOrderStatusForDisplay(nextStatus);
  const isCanceled = nextStatus === "CANCELED";
  const isCompleted = nextStatus === "COMPLETED";
  const isReady =
    nextStatus === "READY_FOR_PICKUP" || nextStatus === "OUT_FOR_DELIVERY";

  const body: string[] = [
    `Change ${orderLabel} to ${label}?`,
  ];

  if (isReady) {
    body.push(
      "The customer may be notified that their order is ready, depending on how they placed the order.",
    );
  } else if (isCompleted) {
    body.push(
      "This closes the order in your dashboard.",
      "The customer is not emailed automatically for this change.",
    );
  } else if (isCanceled) {
    body.push(
      "The order will be marked as cancelled in your records.",
      "The customer is not emailed automatically for this change.",
    );
  }

  body.push("This action cannot be undone from the order screen.");

  return {
    title: isCanceled ? "Cancel order?" : isCompleted ? "Complete order?" : "Mark order ready?",
    body,
    confirmLabel: isCanceled ? "Cancel order" : isCompleted ? "Mark completed" : "Mark ready",
    destructive: isCanceled,
  };
}

export function archiveBusinessCopy(businessName: string, hadActiveSubscription: boolean): ConfirmActionCopy {
  const body = [
    `${businessName} will be archived and removed from public listings.`,
    "Order and billing history is preserved for your records.",
    "Owners lose access to the Business Hub for this business.",
    "This action cannot be undone.",
  ];
  if (hadActiveSubscription) {
    body.splice(2, 0, "Any active subscription will be cancelled.");
  }
  return {
    title: "Archive business?",
    body,
    confirmLabel: "Archive business",
    destructive: true,
  };
}

export function deactivateBusinessCopy(businessName: string): ConfirmActionCopy {
  return {
    title: "Deactivate business?",
    body: [
      `${businessName} will be hidden from customers immediately.`,
      "The storefront will show as closed and the business will not accept new orders.",
      "You can reactivate it anytime by turning Active back on.",
    ],
    confirmLabel: "Deactivate business",
    destructive: true,
  };
}

export function issueRefundCopy(amountLabel: string): ConfirmActionCopy {
  return {
    title: "Issue refund?",
    body: [
      `${amountLabel} will be returned to the customer's original payment method through Stripe.`,
      "The customer may receive a receipt or email notification from your payment processor.",
      "Refunds cannot be undone once Stripe processes them.",
    ],
    confirmLabel: `Refund ${amountLabel}`,
    destructive: true,
  };
}
