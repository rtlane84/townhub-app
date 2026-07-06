import type { Response } from "express";
import type { DeliveryOutcome } from "./notification-delivery";

export function testDeliveryHttpError(outcome: DeliveryOutcome): { status: number; message: string } | null {
  if (outcome.status === "SENT") return null;
  if (outcome.status === "LOGGED") {
    return {
      status: 503,
      message:
        "Notification provider is not configured on the server. Check email, SMS, or environment settings.",
    };
  }
  return {
    status: 502,
    message: outcome.error?.trim() || "Failed to deliver test notification",
  };
}

export function respondToTestDelivery(
  res: Response,
  outcome: DeliveryOutcome,
): outcome is { status: "SENT" } {
  const failure = testDeliveryHttpError(outcome);
  if (!failure) return true;
  res.status(failure.status).json({ ok: false, message: failure.message });
  return false;
}
