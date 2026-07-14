import type { QueryClient } from "@tanstack/react-query";
import {
  getGetPlatformThemeQueryKey,
  setAuthTokenGetter,
  type PlatformTheme,
} from "@workspace/api-client-react";
import {
  readCachedPlatformTheme,
  writeCachedPlatformTheme,
} from "./platform-theme-cache";

/**
 * Clears auth for API calls and wipes user-scoped React Query state while
 * preserving platform branding so public UI does not flash defaults or hang
 * on a stale Clerk getToken after sign-out.
 *
 * Callers must invoke this when the Clerk user id changes (sign-out / account
 * switch). Clear the bearer getter *before* any cache wipe / refetch.
 */
export function resetClientSessionState(queryClient: QueryClient): void {
  // Synchronous — must beat any in-flight or scheduled public refetches.
  setAuthTokenGetter(null);

  const themeKey = getGetPlatformThemeQueryKey();
  const themeFromQuery = queryClient.getQueryData<PlatformTheme>(themeKey);
  const theme = themeFromQuery ?? readCachedPlatformTheme();

  queryClient.clear();

  if (theme) {
    queryClient.setQueryData(themeKey, theme);
    writeCachedPlatformTheme(theme);
  }

  // Remounted/active public observers should refetch without awaiting auth.
  void queryClient.invalidateQueries({ type: "active" });
}
