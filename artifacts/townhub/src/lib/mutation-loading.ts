type PendingSource = { isPending?: boolean };

/** True when any mutation hook reports pending. */
export function isMutationPending(...sources: PendingSource[]): boolean {
  return sources.some((source) => source.isPending === true);
}
