# TownHub iOS App (Capacitor)

Native iOS shell for TownHub. The app loads the deployed TownHub web frontend inside a WKWebView — no native screen rewrites for this MVP.

## Prerequisites

- macOS with [Xcode](https://developer.apple.com/xcode/) installed (**full Xcode app**, not Command Line Tools alone)
- Point `xcode-select` at Xcode if needed:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

- Xcode Command Line Tools: `xcode-select --install`
- [CocoaPods](https://cocoapods.org/): `sudo gem install cocoapods` (or via Homebrew)
- Node.js and **pnpm** (repo standard)
- Apple Developer account (for TestFlight / App Store later)

## Configure the deployed URL

The iOS app loads your hosted TownHub frontend, not a local dev server.

1. Copy the root `.env.example` to `.env` if you have not already.
2. Set the production or beta frontend URL:

```bash
# Root .env (or export before cap sync)
CAPACITOR_SERVER_URL=https://your-townhub.netlify.app
```

Replace the placeholder with your real Netlify (or other) frontend URL. This must match `APP_BASE_URL` on the API so Stripe and notification redirects return to the same host.

3. Re-sync after changing the URL:

```bash
pnpm --filter @workspace/local-order-hub run ios:sync
```

## Install dependencies

From the repository root:

```bash
pnpm install
```

## Build web assets and sync iOS

Capacitor still needs a local `webDir` bundle for sync, even when `server.url` points at production:

```bash
pnpm --filter @workspace/local-order-hub run ios:sync
```

This runs `vite build` and `cap sync ios`.

## Open in Xcode

```bash
pnpm --filter @workspace/local-order-hub run ios:open
```

Or manually open `artifacts/local-order-hub/ios/App/App.xcworkspace`.

## Run on the iOS Simulator

1. Open the project in Xcode (command above).
2. Select a simulator (e.g. iPhone 16) in the scheme toolbar.
3. Press **Run** (⌘R).

CLI alternative:

```bash
pnpm --filter @workspace/local-order-hub exec cap run ios
```

## Run on a physical device

1. Connect your iPhone via USB.
2. Open `ios/App/App.xcworkspace` in Xcode.
3. Select your device in the scheme toolbar.
4. In **Signing & Capabilities**, choose your Apple Developer team.
5. Press **Run** (⌘R). Trust the developer certificate on the device if prompted.

## Auth, Stripe, and external links

| Flow | Behavior |
|------|----------|
| Clerk login | Email/password can use the in-app Clerk UI. **Google OAuth must use Safari** (Google blocks WKWebView — `disallowed_useragent`). Native Google uses HTTPS `https://your-app/native-sso-callback` (Clerk rejects custom schemes), then bounces to `townhub://sso-callback` so the WebView finishes on `/sso-callback`. Allowlist that HTTPS URL under **Native applications → Allowlist for mobile SSO redirect** (not Paths). Deploy the frontend before testing — otherwise Safari shows the app 404 page. |
| In-app navigation | Same routes as the web app (`/`, `/dashboard/business`, `/sign-in`, etc.). On native dashboards, a **Back** control returns to Home. |
| Stripe Checkout / Connect | Opens in the system browser via `@capacitor/browser` on native. Success/cancel URLs must use the same host as `CAPACITOR_SERVER_URL` / `APP_BASE_URL`. |
| External links | `mailto:`, `tel:`, Stripe, Google Maps, Facebook, privacy/terms pages open in Safari. Google OAuth also opens in Safari (required by Google). |
| Deep links | Custom scheme `townhub://` opens the app (`townhub://sso-callback` → `/sso-callback`). Clerk’s OAuth `redirect_url` must stay HTTPS (`/native-sso-callback`). |

## Useful scripts

All commands run from the repo root:

| Script | Description |
|--------|-------------|
| `pnpm --filter @workspace/local-order-hub run cap:sync:ios` | Sync Capacitor plugins and config to iOS |
| `pnpm --filter @workspace/local-order-hub run ios:sync` | Build frontend + sync iOS |
| `pnpm --filter @workspace/local-order-hub run ios:open` | Open Xcode workspace |
| `pnpm --filter @workspace/local-order-hub run ios:run` | Build, sync, and launch on simulator/device |

## TestFlight / App Store (later)

1. Set **Bundle Identifier** to `com.lanetech.townhub` (already configured in `capacitor.config.ts`).
2. Configure app icons and launch screen in Xcode (`ios/App/App/Assets.xcassets`).
3. Archive via **Product → Archive** and upload to App Store Connect.
4. Submit for TestFlight beta review.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank WebView | Confirm `CAPACITOR_SERVER_URL` is reachable in Safari on the same device/simulator. Re-run `ios:sync`. |
| Clerk auth errors | Add your deployed frontend URL to Clerk allowed origins / redirect URLs. |
| Stripe redirect fails | Ensure API `APP_BASE_URL` matches `CAPACITOR_SERVER_URL`. |
| Pod install errors | `cd artifacts/local-order-hub/ios/App && pod install --repo-update` |
| CORS errors | Should not occur — the WebView origin is your deployed HTTPS URL. If testing a staging URL, add it to API `CORS_ALLOWED_ORIGINS`. |

## Native mobile experience (Capacitor only)

When `Capacitor.isNativePlatform()` is true, the same React app gains native polish. **Web browsers are unchanged.**

| Feature | Behavior |
|---------|----------|
| Bottom tabs | Home, Businesses, Events, Food Trucks, Account — hidden on dashboards, storefronts, cart, and checkout. Header Sign In / UserButton is hidden while tabs are visible (Account tab owns that). |
| Dashboard back | Native-only **Back** in the header on Admin / Business Hub |
| Safe areas | Notch, Dynamic Island, home indicator, landscape insets via `env(safe-area-inset-*)` |
| Splash screen | TownHub cream background (`#faf8f5`); stays until load + short minimum, then fades out |
| Status bar | Dark icons on light theme; syncs when `.dark` class toggles |
| Pull to refresh | Home, Businesses, Events, Food Trucks only |
| Haptics | Tab changes, order placed, business approved, save toasts, pull to refresh |

Helpers live in `src/lib/native-platform.ts`, `src/hooks/use-native-platform.ts`, and `src/lib/capacitor-shell.ts`.

## Project layout

```
artifacts/local-order-hub/
├── capacitor.config.ts    # App id, name, remote server URL
├── ios/                   # Native Xcode project (generated)
├── src/lib/capacitor-shell.ts       # Splash, status bar, deep links, external URLs
├── src/lib/native-platform.ts       # isNativeApp(), isIOS(), isAndroid()
├── src/components/native-bottom-tab-bar.tsx
├── src/components/native-pull-to-refresh.tsx
└── dist/public/           # Vite build output (Capacitor webDir)
```

The existing web app code is unchanged; native helpers only run when `Capacitor.isNativePlatform()` is true.
