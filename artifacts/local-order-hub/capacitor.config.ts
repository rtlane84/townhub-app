import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Remote TownHub URL loaded by the iOS WebView shell.
 * Set CAPACITOR_SERVER_URL before `cap sync` (see docs/IOS_APP.md).
 */
const PLACEHOLDER_URL = "https://YOUR-NETLIFY-URL-HERE";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || PLACEHOLDER_URL;

function hostFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    if (url === PLACEHOLDER_URL || hostname.includes("YOUR-NETLIFY-URL-HERE")) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
}

const appHost = hostFromUrl(serverUrl);

const config: CapacitorConfig = {
  appId: "com.lanetech.townhub",
  appName: "TownHub",
  webDir: "dist/public",
  server: {
    url: serverUrl,
    cleartext: false,
    allowNavigation: [
      ...(appHost ? [appHost, `*.${appHost}`] : []),
      "*.stripe.com",
      "stripe.com",
      "checkout.stripe.com",
      "connect.stripe.com",
      "billing.stripe.com",
      "*.clerk.com",
      "clerk.com",
      "*.clerk.accounts.dev",
      "accounts.dev",
      // Keep Google / Apple OAuth inside the WebView so login returns to the app
      "accounts.google.com",
      "*.googleusercontent.com",
      "appleid.apple.com",
    ],
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "App",
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    CapacitorCookies: {
      enabled: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: "#faf8f5",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#faf8f5",
      overlaysWebView: false,
    },
  },
};

export default config;
