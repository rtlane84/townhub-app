import type { Response } from "express";

const ORDER_NOT_FOUND_MESSAGE = "Order not found";

/** Uniform 404 for missing orders and denied access — prevents order ID enumeration. */
export function respondOrderNotFound(res: Response): void {
  res.status(404).json({ error: ORDER_NOT_FOUND_MESSAGE });
}
