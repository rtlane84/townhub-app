import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lanetech.townhub",
  appName: "TownHub",
  webDir: "dist/public",
  server: {
    // Store builds load the reviewed Vite bundle copied by `cap sync`.
    // Never add a remote `url` here for TestFlight or App Store releases.
    hostname: "localhost",
    cleartext: false,
    allowNavigation: [
      "*.stripe.com",
      "stripe.com",
      "checkout.stripe.com",
      "connect.stripe.com",
      "billing.stripe.com",
      "*.clerk.com",
      "clerk.com",
      "*.clerk.accounts.dev",
      "accounts.dev",
      // In-WebView OAuth: the WKWebView follows the Clerk → provider → Clerk
      // redirect chain and returns to capacitor://localhost/sso-callback, where
      // Clerk's handshake finishes the session. These provider hosts must stay
      // in-WebView (not open externally). Apple works here; Google rejects
      // embedded web views (disallowed_useragent) and shows a fallback message.
      "appleid.apple.com",
      "*.apple.com",
      "accounts.google.com",
      "*.google.com",
      "*.gstatic.com",
    ],
  },
  ios: {
    // Edge-to-edge WebView — safe areas are handled in CSS so the app
    // background extends behind the status bar and home indicator.
    contentInset: "never",
    preferredContentMode: "mobile",
    scheme: "capacitor",
  },
  plugins: {
    // Keep CapacitorHttp OFF — patching global fetch breaks Clerk/Vite in WKWebView.
    // CapacitorCookies OFF: enabling it during OAuth debugging coincided with native
    // list pages receiving non-array payloads (.map/.filter crashes). Clerk finishes
    // Apple/Google in-WebView via authenticateWithRedirect + capacitor://localhost
    // handshake (allowed origin); do not re-enable without verifying list API arrays.
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
      // LIGHT = dark clock/icons for light canvas (Capacitor naming).
      style: "LIGHT",
      backgroundColor: "#F4F5F8",
      // true + contentInset:never = edge-to-edge; CSS --safe-area-top clears the clock.
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
