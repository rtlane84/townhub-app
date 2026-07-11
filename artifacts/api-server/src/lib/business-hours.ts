import { parseStructuredHours, normalizeWeeklyHours, formatBusinessHoursLines } from "@workspace/api-zod";

/** Parse and normalize structured hours from API input; null clears stored hours. */
export function resolveStructuredHoursInput(raw: unknown): ReturnType<typeof normalizeWeeklyHours> | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const parsed = parseStructuredHours(raw);
  return parsed ? normalizeWeeklyHours(parsed) : null;
}

/** When structured hours are saved, also write a human-readable legacy `hours` string. */
export function legacyHoursFromStructured(raw: unknown): string | null {
  const parsed = parseStructuredHours(raw);
  if (!parsed?.length) return null;
  return formatBusinessHoursLines(parsed).join("\n");
}
