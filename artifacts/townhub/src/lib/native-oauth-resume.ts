import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

const NATIVE_OAUTH_PENDING_KEY = "townhub.nativeOAuthPending";
const AUTH_SESSION_HANDLED_UNTIL_KEY = "townhub.authSessionHandledUntil";
const LAST_AUTH_RETURN_KEY = "townhub.lastAuthReturnShape";

/** How long to wait for townhub://sso-callback before treating OAuth as cancelled. */
const OAUTH_DEEP_LINK_GRACE_MS = 8_000;

/** Ignore racing bare appUrlOpen after AuthSession already remounted. */
const AUTH_SESSION_HANDLED_TTL_MS = 8_000;

/** Mark that Google OAuth is in progress so we can refresh UI when Safari closes. */
export function markNativeOAuthPending(): void {
  try {
    sessionStorage.setItem(NATIVE_OAUTH_PENDING_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function clearNativeOAuthPending(): void {
  try {
    sessionStorage.removeItem(NATIVE_OAUTH_PENDING_KEY);
  } catch {
    // ignore
  }
}

export function isNativeOAuthPending(maxAgeMs = 15 * 60 * 1000): boolean {
  try {
    const raw = sessionStorage.getItem(NATIVE_OAUTH_PENDING_KEY);
    if (!raw) return false;
    const started = Number(raw);
    if (!Number.isFinite(started)) return false;
    return Date.now() - started < maxAgeMs;
  } catch {
    return false;
  }
}

/** AuthSession already remounted — ignore Cap appUrlOpen SSO for a short window. */
export function markNativeAuthSessionHandled(): void {
  try {
    sessionStorage.setItem(
      AUTH_SESSION_HANDLED_UNTIL_KEY,
      String(Date.now() + AUTH_SESSION_HANDLED_TTL_MS),
    );
  } catch {
    // ignore
  }
}

export function isNativeAuthSessionHandled(): boolean {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_HANDLED_UNTIL_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    if (Date.now() > until) {
      sessionStorage.removeItem(AUTH_SESSION_HANDLED_UNTIL_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function rememberNativeAuthReturnShape(description: string): void {
  try {
    sessionStorage.setItem(LAST_AUTH_RETURN_KEY, description);
  } catch {
    // ignore
  }
}

export function consumeNativeAuthReturnShape(): string | null {
  try {
    const value = sessionStorage.getItem(LAST_AUTH_RETURN_KEY);
    sessionStorage.removeItem(LAST_AUTH_RETURN_KEY);
    return value;
  } catch {
    return null;
  }
}

function isOnSsoCallbackPath(pathname = window.location.pathname): boolean {
  return pathname.includes("sso-callback");
}

/**
 * Fallback when Safari closes / the app becomes active after Google OAuth.
 *
 * IMPORTANT: Never navigate to `/` here. Safari cookies are not shared with
 * WKWebView — the only way to finish the session is appUrlOpen → /sso-callback
 * with Clerk handshake params. Reloading `/` without those params leaves the
 * user signed out (the intermittent "back to sign-in" bug).
 *
 * Delayed so appUrlOpen → /sso-callback can win the race first. If the deep
 * link never arrives (user cancelled), clear the pending flag after a grace
 * period and stay on the current screen.
 */
export async function refreshAppAfterNativeOAuth(): Promise<void> {
  if (!isNativeOAuthPending()) return;

  if (isOnSsoCallbackPath()) {
    clearNativeOAuthPending();
    try {
      await Browser.close();
    } catch {
      // already closed
    }
    return;
  }

  try {
    await Browser.close();
  } catch {
    // already closed
  }

  // Deep link may still be in flight — give appUrlOpen time to win.
  window.setTimeout(() => {
    if (!isNativeOAuthPending()) return;
    if (isOnSsoCallbackPath()) {
      clearNativeOAuthPending();
      return;
    }
    // No SSO callback arrived — user cancelled or bounce failed. Stay put.
    clearNativeOAuthPending();
  }, OAUTH_DEEP_LINK_GRACE_MS);
}

export function installNativeOAuthResumeHandlers(): void {
  const scheduleResume = () => {
    // Short delay so appUrlOpen → /sso-callback can land first when both fire.
    window.setTimeout(() => {
      void refreshAppAfterNativeOAuth();
    }, 900);
  };

  void Browser.addListener("browserFinished", scheduleResume);

  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) scheduleResume();
  });
}
