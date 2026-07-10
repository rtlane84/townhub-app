import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

const NATIVE_OAUTH_PENDING_KEY = "townhub.nativeOAuthPending";

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

/**
 * Fallback when the deep-link bounce fails: closing Safari / returning to the app
 * should still reload so Clerk can pick up a completed session if possible.
 * Delayed so appUrlOpen → /sso-callback can win the race first.
 */
export async function refreshAppAfterNativeOAuth(): Promise<void> {
  if (!isNativeOAuthPending()) return;
  clearNativeOAuthPending();
  try {
    await Browser.close();
  } catch {
    // already closed
  }
  // Already on the SSO callback with Clerk params — let AuthenticateWithRedirectCallback finish.
  if (window.location.pathname.includes("sso-callback")) return;

  const origin = window.location.origin.replace(/\/+$/, "");
  window.location.assign(`${origin}/`);
}

export function installNativeOAuthResumeHandlers(): void {
  const scheduleResume = () => {
    window.setTimeout(() => {
      void refreshAppAfterNativeOAuth();
    }, 900);
  };

  void Browser.addListener("browserFinished", scheduleResume);

  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) scheduleResume();
  });
}
