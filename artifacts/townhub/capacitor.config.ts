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
      // Do NOT allow townhub.io here. Navigating the Cap WebView to the HTTPS
      // OAuth bounce (then to capacitor://) blanks the app. Apple/Google OAuth
      // must stay in Cap Browser so capacitor://localhost + appUrlOpen survive.
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
    // CapacitorCookies helps persist Clerk session cookies after Safari OAuth return.
    CapacitorHttp: {
      enabled: false,
    },
    CapacitorCookies: {
      enabled: true,
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
