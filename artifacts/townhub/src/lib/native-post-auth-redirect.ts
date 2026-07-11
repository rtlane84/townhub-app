/**
 * Remember where to return after native Google OAuth (full remount via /sso-callback).
 * Email modal sign-in never leaves the page, so it does not need this.
 */
const POST_AUTH_REDIRECT_KEY = "townhub.postAuthRedirect";

const BLOCKED_PREFIXES = [
  "/sso-callback",
  "/native-sso-callback",
  "/sign-in",
  "/sign-up",
  "/native-checkout-return",
];

function isBlockedReturnPath(path: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

export function rememberPostAuthRedirect(path?: string): void {
  try {
    const value =
      path ??
      `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (!value.startsWith("/")) return;
    if (isBlockedReturnPath(value)) return;
    sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, value);
  } catch {
    // ignore
  }
}

export function peekPostAuthRedirect(): string | null {
  try {
    return sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  } catch {
    return null;
  }
}

/** Read and clear the stored return path. Safe to call once on SSO callback mount. */
export function consumePostAuthRedirect(fallback = "/"): string {
  try {
    const value = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
    sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    if (!value || !value.startsWith("/") || isBlockedReturnPath(value)) {
      return fallback;
    }
    return value;
  } catch {
    return fallback;
  }
}
