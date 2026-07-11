/**
 * Track whether the branded React splash already ran in this WebView session.
 * OAuth return does a full location.assign remount — without this flag the
 * 3s AnimatedSplash would play again every Google sign-in.
 *
 * sessionStorage clears when the WKWebView process dies (true cold start),
 * so LaunchScreen + splash still show on real app launches.
 */
const SPLASH_SHOWN_KEY = "townhub.nativeSplashShown";

export function hasNativeSplashShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markNativeSplashShownThisSession(): void {
  try {
    sessionStorage.setItem(SPLASH_SHOWN_KEY, "1");
  } catch {
    // ignore
  }
}

/** Call before OAuth location.assign so the remount skips the branded splash. */
export function skipNativeSplashOnNextLoad(): void {
  markNativeSplashShownThisSession();
}
