/** Zod `.optional()` accepts undefined but not null — normalize request bodies from JSON clients. */
export function nullsToUndefinedTopLevel(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([key, value]) => [
      key,
      value === null ? undefined : value,
    ]),
  );
}
