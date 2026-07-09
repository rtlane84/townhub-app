import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

const EXTERNAL_SCHEMES = ["mailto:", "tel:", "sms:", "maps:", "geo:"];

function resolveInAppUrl(rawUrl: string): string {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  const path = rawUrl.replace(/^townhub:\/\/?/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${normalizedPath}`;
}

function isExternalHttpLink(href: string, appHost: string): boolean {
  try {
    const link = new URL(href);
    if (link.protocol !== "http:" && link.protocol !== "https:") {
      return false;
    }
    return link.hostname !== appHost;
  } catch {
    return false;
  }
}

/**
 * Native-only helpers for deep links and external URLs.
 * No-op in the browser — web behavior is unchanged.
 */
export function initCapacitorShell(): void {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  void App.addListener("appUrlOpen", ({ url }) => {
    if (url.startsWith("townhub://")) {
      window.location.href = resolveInAppUrl(url);
    }
  });

  document.addEventListener(
    "click",
    (event) => {
      const anchor = (event.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href) {
        return;
      }

      if (EXTERNAL_SCHEMES.some((scheme) => href.startsWith(scheme))) {
        event.preventDefault();
        void Browser.open({ url: href });
        return;
      }

      const appHost = window.location.hostname;
      const opensNewTab = anchor.target === "_blank" || anchor.target === "_system";

      if (opensNewTab && isExternalHttpLink(href, appHost)) {
        event.preventDefault();
        void Browser.open({ url: href });
      }
    },
    true,
  );
}
