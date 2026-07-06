import type { QueryClient, QueryFilters } from "@tanstack/react-query";

export function isQueryCancellationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "CancelledError" || /cancel/i.test(error.message);
}

export async function safeCancelQueries(
  queryClient: QueryClient,
  filters?: QueryFilters,
): Promise<void> {
  try {
    await queryClient.cancelQueries(filters);
  } catch (error) {
    if (!isQueryCancellationError(error)) throw error;
  }
}

export function safeInvalidateQueries(
  queryClient: QueryClient,
  filters?: QueryFilters,
): void {
  void queryClient.invalidateQueries(filters).catch((error: unknown) => {
    if (!isQueryCancellationError(error)) {
      console.error(error);
    }
  });
}
