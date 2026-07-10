import { useCallback, useRef, useState } from "react";

/**
 * Wraps an async handler with duplicate-click prevention and pending state.
 * Ignores additional invocations while a run is in flight.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  pending: boolean;
} {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (pendingRef.current) return undefined;
      pendingRef.current = true;
      setPending(true);
      try {
        return await action(...args);
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [action],
  );

  return { run, pending };
}
