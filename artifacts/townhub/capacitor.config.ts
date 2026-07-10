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
    // Edge-to-edge WebView — safe areas are handled in CSS so the app
    // background extends behind the status bar and home indicator.
    contentInset: "never",
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
      backgroundColor: "#F4F5F8",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#F4F5F8",
      // false = system reserves status-bar space on every iPhone (no per-model CSS).
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
