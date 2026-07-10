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
import { resolveNativeDeepLinkToAppUrl, isNativeSsoCallbackUrl } from "@/lib/native-oauth";
import {
  clearNativeOAuthPending,
  installNativeOAuthResumeHandlers,
} from "@/lib/native-oauth-resume";

const SPLASH_MIN_VISIBLE_MS = 900;

function isDarkThemeActive(): boolean {
  return document.documentElement.classList.contains("dark");
}

async function syncNativeStatusBar(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const dark = isDarkThemeActive();
    const platform = Capacitor.getPlatform();
    await StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark });
    // iOS: overlay so CSS background extends under the status bar (no color gap).
    // Android: solid bar color matched to the live theme background.
    if (platform === "ios") {
      await StatusBar.setOverlaysWebView({ overlay: true });
    } else if (platform === "android") {
      await StatusBar.setOverlaysWebView({ overlay: false });
      const bg = getComputedStyle(document.documentElement)
        .getPropertyValue("--background")
        .trim();
      // --background is "H S% L%" — convert to a usable hex via a temp element when possible
      const probe = document.createElement("div");
      probe.style.color = bg ? `hsl(${bg})` : "";
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).color;
      document.body.removeChild(probe);
      const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const color = match
        ? `#${[match[1], match[2], match[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`
        : dark
          ? "#1a1614"
          : "#F4F5F8";
      await StatusBar.setBackgroundColor({ color });
    }
  } catch {
    // Status bar plugin unavailable.
  }
}

async function hideNativeSplashScreen(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    await SplashScreen.hide({ fadeOutDuration: 350 });
  } catch {
    // Splash screen already hidden or unavailable.
  }
}

function scheduleSplashHide(): void {
  const startedAt = Date.now();

  const finish = () => {
    const elapsed = Date.now() - startedAt;
    const wait = Math.max(0, SPLASH_MIN_VISIBLE_MS - elapsed);
    window.setTimeout(() => {
      void hideNativeSplashScreen();
    }, wait);
  };

  if (document.readyState === "complete") {
    finish();
    return;
  }

  window.addEventListener("load", finish, { once: true });
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
  void syncNativeStatusBar();
  scheduleSplashHide();

  const themeObserver = new MutationObserver(() => {
    void syncNativeStatusBar();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  void App.addListener("appUrlOpen", ({ url }) => {
    void closeExternalBrowser();
    if (url.startsWith("townhub://") || url.startsWith(window.location.origin)) {
      if (isNativeSsoCallbackUrl(url)) {
        clearNativeOAuthPending();
      }
      const next = resolveNativeDeepLinkToAppUrl(url, window.location.origin);
      // Full navigation so Clerk reloads with OAuth query params and finishes the session.
      window.location.assign(next);
    }
  });

  // Cold-start deep link (app launched via townhub:// while not running).
  void App.getLaunchUrl().then((result) => {
    const url = result?.url;
    if (!url) return;
    if (url.startsWith("townhub://") || url.startsWith(window.location.origin)) {
      if (isNativeSsoCallbackUrl(url)) {
        clearNativeOAuthPending();
      }
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
