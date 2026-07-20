/** Max length for event descriptions shown on public event cards (≈2 lines). */
export const EVENT_DESCRIPTION_CARD_MAX_LENGTH = 120;

export const EVENT_DESCRIPTION_CARD_HINT =
  `Shown on event cards · max ${EVENT_DESCRIPTION_CARD_MAX_LENGTH} characters`;

/** Truncate for card display without cutting mid-word when possible. */
export function truncateEventDescription(
  description: string | null | undefined,
  maxLength = EVENT_DESCRIPTION_CARD_MAX_LENGTH,
): string {
  const text = description?.trim() ?? "";
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${base.trimEnd()}…`;
}
