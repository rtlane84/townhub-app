import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { isNativeApp } from "@/lib/native-platform";
import {
  isExternalScheme,
  isGoogleMapsUrl,
  isStripeCheckoutUrl,
  shouldOpenLinkExternally,
} from "@/lib/native-external-links";
import { resolveNativeDeepLinkToAppUrl, isNativeSsoCallbackUrl, nativeSsoDeepLinkHasParams } from "@/lib/native-oauth";
import {
  clearNativeOAuthPending,
  installNativeOAuthResumeHandlers,
  isNativeOAuthPending,
} from "@/lib/native-oauth-resume";
import { skipNativeSplashOnNextLoad } from "@/lib/native-splash-session";

/** Fallback if React splash never mounts — keep native splash from sticking forever. */
const SPLASH_NATIVE_FALLBACK_HIDE_MS = 4500;

function isDarkThemeActive(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Resolve app canvas color for native status-bar chrome. */
function resolveNativeCanvasHex(dark: boolean): string {
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim();
  const probe = document.createElement("div");
  probe.style.color = bg ? `hsl(${bg})` : "";
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return `#${[match[1], match[2], match[3]]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return dark ? "#1a1614" : "#F4F5F8";
}

/**
 * Measure WebKit safe-area insets. On some Capacitor iOS builds env() is 0 even
 * with viewport-fit=cover — fall back to a device-agnostic status-bar estimate.
 */
function measureCssSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  const probe = document.createElement("div");
  probe.setAttribute("data-safe-area-probe", "");
  probe.style.cssText = [
    "position:absolute",
    "visibility:hidden",
    "pointer-events:none",
    "padding-top:env(safe-area-inset-top, 0px)",
    "padding-right:env(safe-area-inset-right, 0px)",
    "padding-bottom:env(safe-area-inset-bottom, 0px)",
    "padding-left:env(safe-area-inset-left, 0px)",
  ].join(";");
  document.documentElement.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/** Estimate status-bar inset when CSS env() reports 0 (still works across iPhone models). */
function estimateIosStatusBarInsetPx(): number {
  const shortSide = Math.min(window.screen.width, window.screen.height);
  const longSide = Math.max(window.screen.width, window.screen.height);
  // SE / older small phones
  if (longSide <= 667) return 20;
  // Dynamic Island class (Pro / larger logical width)
  if (shortSide >= 390) return 59;
  // Standard notch
  return 47;
}

/**
 * Publish --safe-area-* on <html>. Prefer CSS env(); if top is 0 on iOS with an
 * edge-to-edge webview (contentInset: never), inject a status-bar estimate so the
 * header clears the clock on every iPhone.
 */
function syncNativeSafeAreaCssVars(options?: { statusBarOverlaysWebView?: boolean }): void {
  if (!isNativeApp()) return;

  const measured = measureCssSafeAreaInsets();
  let top = measured.top;
  let bottom = measured.bottom;
  let left = measured.left;
  let right = measured.right;

  const platform = Capacitor.getPlatform();
  const overlays = options?.statusBarOverlaysWebView !== false;

  // iOS uses contentInset: never — the webview always paints under the status bar.
  // Never zero the top inset; if env() is missing, estimate so the clock stays clear.
  if (platform === "ios" && overlays && top < 1) {
    top = estimateIosStatusBarInsetPx();
  }

  const root = document.documentElement;
  root.style.setProperty("--safe-area-top", `${top}px`);
  root.style.setProperty("--safe-area-right", `${right}px`);
  root.style.setProperty("--safe-area-bottom", `${bottom}px`);
  root.style.setProperty("--safe-area-left", `${left}px`);
}

async function syncNativeStatusBar(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const dark = isDarkThemeActive();
    const platform = Capacitor.getPlatform();
    const canvas = resolveNativeCanvasHex(dark);
    // Capacitor naming is inverted vs iOS: Style.Light = dark icons (light bg),
    // Style.Dark = light icons (dark bg). Wrong mapping = white clock on white header.
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });

    if (platform === "ios") {
      // Edge-to-edge (matches ios.contentInset: never). Header padding uses
      // --safe-area-top so logo/nav sit below the clock; canvas paints behind it.
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setBackgroundColor({ color: canvas });
      syncNativeSafeAreaCssVars({ statusBarOverlaysWebView: true });
    } else if (platform === "android") {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: canvas });
      syncNativeSafeAreaCssVars({ statusBarOverlaysWebView: false });
    }
  } catch {
    // Status bar plugin unavailable — still try CSS safe areas / iOS estimate.
    syncNativeSafeAreaCssVars({ statusBarOverlaysWebView: true });
  }
}

/** Hide Capacitor/native splash — called by AnimatedSplash on first paint. */
export async function hideNativeSplashScreen(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    // Splash screen already hidden or unavailable.
  }
}

/**
 * Safety net only. The React AnimatedSplash owns the branded handoff and calls
 * hideNativeSplashScreen() as soon as it paints.
 */
function scheduleSplashHideFallback(): void {
  window.setTimeout(() => {
    void hideNativeSplashScreen();
  }, SPLASH_NATIVE_FALLBACK_HIDE_MS);
}

function applyNativeDocumentClass(): void {
  if (!isNativeApp()) return;
  document.documentElement.classList.add("native-app");
  if (Capacitor.getPlatform() === "ios") {
    document.documentElement.classList.add("native-ios");
  }
  if (Capacitor.getPlatform() === "android") {
    document.documentElement.classList.add("native-android");
  }
}

function openExternalUrl(url: string): void {
  // System schemes must leave the WebView directly. Browser.open is for http(s)
  // and often no-ops for tel:/mailto: on iOS.
  if (/^(tel|mailto|sms|maps|geo):/i.test(url)) {
    window.location.assign(url);
    return;
  }
  void Browser.open({ url });
}

async function closeExternalBrowser(): Promise<void> {
  try {
    await Browser.close();
  } catch {
    // Browser may already be closed.
  }
}

function isGoogleOAuthUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return /^accounts\.google\./i.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Native-only shell: splash, status bar, deep links, and external URL handling.
 * No-op in the browser — web behavior is unchanged.
 */
export function initCapacitorShell(): void {
  if (!isNativeApp()) {
    return;
  }

  applyNativeDocumentClass();
  // Measure before StatusBar async settles so the first paint already clears the clock.
  syncNativeSafeAreaCssVars({
    statusBarOverlaysWebView: Capacitor.getPlatform() === "ios",
  });
  void syncNativeStatusBar();
  // Re-measure after first layout / rotation (orientation, Dynamic Island).
  window.addEventListener("resize", () => {
    syncNativeSafeAreaCssVars({
      statusBarOverlaysWebView: Capacitor.getPlatform() === "ios",
    });
  });
  // Second pass after layout — env() is sometimes 0 on the first tick in WKWebView.
  window.requestAnimationFrame(() => {
    syncNativeSafeAreaCssVars({
      statusBarOverlaysWebView: Capacitor.getPlatform() === "ios",
    });
  });
  scheduleSplashHideFallback();

  const themeObserver = new MutationObserver(() => {
    void syncNativeStatusBar();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  void App.addListener("appUrlOpen", ({ url }) => {
    void closeExternalBrowser();
    if (
      url.startsWith("townhub://") ||
      url.startsWith("capacitor://") ||
      url.startsWith(window.location.origin) ||
      /^https:\/\//i.test(url)
    ) {
      // Cap/iOS sometimes delivers a bare townhub://sso-callback before the
      // param-bearing open. Ignore empty callbacks while OAuth is in flight.
      if (
        isNativeSsoCallbackUrl(url) &&
        isNativeOAuthPending() &&
        !nativeSsoDeepLinkHasParams(url)
      ) {
        return;
      }
      if (isNativeSsoCallbackUrl(url)) {
        clearNativeOAuthPending();
      }
      // Full reload remounts React — skip branded splash on OAuth / checkout return.
      skipNativeSplashOnNextLoad();
      const next = resolveNativeDeepLinkToAppUrl(url, window.location.origin);
      // Full navigation so Clerk reloads with OAuth query params and finishes the session.
      window.location.assign(next);
    }
  });

  // Cold-start deep link (app launched via townhub:// while not running).
  void App.getLaunchUrl().then((result) => {
    const url = result?.url;
    if (!url) return;
    if (
      url.startsWith("townhub://") ||
      url.startsWith("capacitor://") ||
      url.startsWith(window.location.origin) ||
      /^https:\/\//i.test(url)
    ) {
      if (
        isNativeSsoCallbackUrl(url) &&
        isNativeOAuthPending() &&
        !nativeSsoDeepLinkHasParams(url)
      ) {
        return;
      }
      if (isNativeSsoCallbackUrl(url)) {
        clearNativeOAuthPending();
      }
      skipNativeSplashOnNextLoad();
      const next = resolveNativeDeepLinkToAppUrl(url, window.location.origin);
      if (next !== window.location.href) {
        window.location.assign(next);
      }
    }
  });

  installNativeOAuthResumeHandlers();

  document.addEventListener(
    "click",
    (event) => {
      const anchor = (event.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      const absoluteHref = (() => {
        try {
          return new URL(href, window.location.href).toString();
        } catch {
          return href;
        }
      })();

      // Google OAuth must use the system browser (WKWebView → disallowed_useragent).
      if (isGoogleOAuthUrl(absoluteHref)) {
        event.preventDefault();
        openExternalUrl(absoluteHref);
        return;
      }

      if (isExternalScheme(absoluteHref)) {
        event.preventDefault();
        openExternalUrl(absoluteHref);
        return;
      }

      const appHost = window.location.hostname;

      if (
        shouldOpenLinkExternally(absoluteHref, appHost, {
          target: anchor.target,
        }) ||
        isGoogleMapsUrl(absoluteHref)
      ) {
        event.preventDefault();
        openExternalUrl(absoluteHref);
      }
    },
    true,
  );
}

/** Open Stripe Checkout in the system browser on native. */
export function openStripeCheckoutUrl(url: string): void {
  if (isNativeApp() && isStripeCheckoutUrl(url)) {
    openExternalUrl(url);
    return;
  }
  window.location.href = url;
}

export { syncNativeStatusBar };
