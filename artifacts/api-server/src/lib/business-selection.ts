/**
 * Pure selection helper for multi-business dashboard context.
 */
export function resolveSelectedBusinessId(
  ownedIds: number[],
  requestedId: number | null | undefined,
  fallbackId: number | null | undefined,
): number | null {
  if (requestedId != null && ownedIds.includes(requestedId)) {
    return requestedId;
  }
  if (fallbackId != null && ownedIds.includes(fallbackId)) {
    return fallbackId;
  }
  return ownedIds[0] ?? null;
}
