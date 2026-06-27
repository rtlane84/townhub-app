import { parseStructuredHours } from "@workspace/api-zod";
import type { Business } from "@workspace/api-client-react";

export function resolveBusinessHours(business: Pick<Business, "hours" | "structuredHours">) {
  const structuredHours = parseStructuredHours(business.structuredHours);
  const fallbackHours = business.hours?.trim() || null;
  const hasHours = !!(structuredHours?.length || fallbackHours);
  return { structuredHours, fallbackHours, hasHours };
}
