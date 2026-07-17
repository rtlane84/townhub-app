# TownHub iOS App (Capacitor)

TownHub iOS is a Capacitor shell around the responsive React application. App Store builds package the reviewed Vite assets inside the native bundle and call a selected remote API. They do not use Capacitor `server.url` or download the deployed web application as executable UI.

## Prerequisites

- macOS with the full current Xcode release required by App Store Connect
- Xcode Command Line Tools and CocoaPods
- Node.js and the repository pnpm version
- Apple Developer Program membership
- A Clerk native application and Sign in with Apple connection for `com.lanetech.townhub`

Open the workspace, not the project file:

```bash
pnpm --filter @workspace/townhub run ios:open
```

## Build-time configuration

The iOS bundle requires these build-time values:

| Variable | Purpose |
|---|---|
| `DEPLOYMENT_ENVIRONMENT` | `staging` for TestFlight testing or `production` for the App Store candidate |
| `VITE_CLERK_PUBLISHABLE_KEY` | Matching Clerk instance publishable key |
| `VITE_API_BASE_URL` | Matching remote API HTTPS origin |
| `VITE_PUBLIC_WEB_URL` | Matching public web HTTPS origin used for OAuth return bridges |
| `VITE_SENTRY_DSN` | Native frontend error project/DSN |
| `VITE_DISTRIBUTION_CHANNEL` | `app-store` |

**Do not** set `VITE_CLERK_PROXY_URL` in native build env (copy from root `.env.example`). That value targets local web dev and makes Clerk load from unreachable `localhost` on a device. Use `.env.native.staging.example` as a template.

The API must allow the fixed bundled WebView origin:

```bash
NATIVE_ALLOWED_ORIGINS=capacitor://localhost
```

Validate the selected environment before syncing (or use the release prepare scripts):

```bash
pnpm release:ios:staging
# or: pnpm release:ios:production
```

Equivalent manual steps:

```bash
pnpm run release:check-env -- --environment staging --component native
pnpm --filter @workspace/townhub run ios:sync
```

`ios:sync` builds the Vite application and copies `dist/public` into the native project. Any React code, help copy, legal copy, build-time variable, Capacitor configuration, plugin, entitlement, or bundled asset change requires a new iOS build and App Store Connect upload. A website deploy alone does not update an installed app. See [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) for day-to-day branch and versioning rules.

## Environment targeting

- Internal and early external TestFlight builds target the isolated staging API and web OAuth bridge.
- The App Store release candidate is rebuilt from the approved commit with production API/web values.
- Increment `CURRENT_PROJECT_VERSION` for every App Store Connect upload.
- Never submit a staging-targeted archive as the production App Store version.

See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for the full isolation matrix.

## Authentication

Native sign-in on iOS offers **Apple**, **Google**, and **email**.

### Why not browser-based OAuth on iOS

The web Clerk SDK (`@clerk/react`) completes OAuth via a cookie/handshake in the **same browser context** and needs to redirect back to an **https origin**. The Capacitor app can't provide one: Capacitor serves the bundle over the custom `capacitor://localhost` scheme, and WKWebView reserves `http`/`https` so `server.iosScheme` cannot be set to https. Consequences we verified on-device:

- Full-page OAuth (`signIn.sso`) → Apple returns to `capacitor://localhost/...` → **blank** (WKWebView can't complete a redirect into the custom scheme).
- `ASWebAuthenticationSession` + custom scheme → Google loads, but the web SDK can't recover the session (`bare-sso`, signed out).
- Google inside WKWebView → **`403 disallowed_useragent`** (Google blocks embedded web views).

So browser-based Clerk OAuth cannot work in the iOS Capacitor shell. The web build is unaffected and still uses Clerk's hosted OAuth.

### Native Apple (current)

Apple uses the **native `ASAuthorization` sheet** — no browser, no redirect:

1. `AuthSession.appleSignIn()` (in the `@townhub/capacitor-auth-session` plugin, `AuthenticationServices` — a built-in framework, no external SDK) presents the Apple sheet and returns the **identity token** (JWT). A **nonce** is required; without it Clerk rejects with “not authorized”.
2. Clerk token exchange uses **`oauth_token_apple`**. Production treats each Apple token as one-shot: **SignIn first** (returning users). If Clerk reports transferable / no account, present Apple **again** for a fresh token and **`signUp.create`** with that token. Do not `transfer: true` or reuse the first token — both fail on Production.
3. `clerk.setActive({ session })` establishes the session in the WebView. The app initializes Clerk with `standardBrowser: false` on native and persists Clerk's rotating native client token in the iOS Keychain so the session can be restored after app termination.

**Required config for the token to verify (staging + production):**

- **Clerk → Apple connection → enable "Use custom credentials"** and add the Apple **Services ID**, **Team ID**, **Key ID**, and **.p8 key**. Without custom credentials Clerk uses shared dev credentials whose `aud` won't match the app's identity token, and the exchange fails.
- **Apple Developer:** a **Services ID** and a **Sign in with Apple key (.p8)** tied to bundle `com.lanetech.townhub`. The **Sign in with Apple** capability/entitlement is already in `App.entitlements`.
- Configure Apple private-email relay for TownHub sender domains (Hide My Email).
- **Production bot sign-up protection / CAPTCHA must stay off** for the Capacitor app (Turnstile fails in WKWebView and blocks first-time Apple sign-up).
- Add `capacitor://localhost` to the Clerk instance **allowed_origins** so the WebView can load Clerk.

Adding the plugin method requires re-running `ios:sync` (pod re-sync) and a rebuild.

Test Apple first-time consent, Hide My Email, returning users, canceled auth, and sign-out on a physical device.

### Google (native)

Google uses the **Google Sign-In iOS SDK** (`GIDSignIn`) inside `@townhub/capacitor-auth-session`:

1. `AuthSession.googleSignIn({ clientId, serverClientId })` returns an **ID token**.
2. `clerk.authenticateWithGoogleOneTap({ token })` verifies it; then `setActive`.

**Required config:**

- **Google Cloud:** an **iOS** OAuth client for bundle `com.lanetech.townhub`, plus a **Web** OAuth client (its client ID becomes the ID token `aud` / `serverClientId`).
- Put both in `.env.native.staging` as `VITE_GOOGLE_IOS_CLIENT_ID` and `VITE_GOOGLE_SERVER_CLIENT_ID`. `ios:sync` patches `Info.plist` (`GIDClientID`, `GIDServerClientID`, reversed URL scheme).
- **Clerk → Google → Use custom credentials ON**, using that same **Web** client ID + secret.
- AppDelegate forwards Google callback URLs via `GIDSignIn.sharedInstance.handle(url)`.

Without those env vars the Google button still appears but shows a configuration error (Apple and email remain available).

## Store billing behavior

The iOS app includes the customer marketplace, Business Hub, and role-protected admin dashboard. Customer checkout for physical goods/services remains available.

TownHub owner SaaS billing is read-only in store distributions:

- Owners can see the assigned plan, status, enabled features, and renewal/access dates.
- Subscribe, Start Trial, Change Plan, Stripe Billing portal, and billing deep-link actions are suppressed.
- Approved owners receive account setup instructions by email.
- Admin plan assignment remains available to authorized platform administrators.

`VITE_DISTRIBUTION_CHANNEL=app-store` activates this behavior, and native runtime detection fails closed if the variable is missing.

## Account deletion and legal pages

- Signed-in users open **Account → Delete TownHub account**, type `DELETE`, and receive a processing date.
- Pending requests can be canceled and are visible in Admin → Users.
- Operators follow [ACCOUNT_DELETION_RUNBOOK.md](./ACCOUNT_DELETION_RUNBOOK.md).
- `/privacy-policy` and `/terms-of-service` are bundled routes and must also be deployed at stable public HTTPS URLs for App Store Connect metadata.
- Privacy disclosures and `PrivacyInfo.xcprivacy` must match actual Clerk, Stripe, Sentry, notification, storage, order, appointment, and business data handling.
- Enter App Store Connect privacy answers using [APP_STORE_PRIVACY.md](./APP_STORE_PRIVACY.md) (IOS-004 owner sign-off checklist).

## Push notifications

TownHub uses Capacitor Push Notifications and the shared notification pipeline. The Xcode project includes Push Notifications and remote-notification background mode declarations.

Before device testing:

1. Enable Push Notifications for the App ID and provisioning profiles.
2. Create/configure the APNs key and `APNS_*` API variables.
3. Ensure the bundle ID is `com.lanetech.townhub`.
4. On a physical device, grant permission, verify registration in `device_tokens`, and send an authorized test push.
5. Test signed-in customer, owner, and admin deep links without exposing guest tokens or PII.

See [NOTIFICATIONS.md](./NOTIFICATIONS.md) for event routing and critical payment alerts.

## Native capabilities and metadata

The checked-in native project includes:

- iPhone-only target family
- `App.entitlements` for Push Notifications and Sign in with Apple
- `PrivacyInfo.xcprivacy`
- `townhub://` callback scheme
- bundled app icons and launch assets

Before archive, verify in Xcode:

- Signing team, bundle ID, provisioning profile, capabilities, minimum iOS version
- marketing version and unique build number
- icons and launch screen at all required sizes
- Release configuration uses the expected entitlements
- privacy manifest is present in the built product

## Day-to-day releases

For branch flow (`develop` → staging, `main` → production), when a new IPA is required, version numbering, and the full script cheat sheet, see [RELEASE_PROCESS.md](./RELEASE_PROCESS.md).

Quick prepare commands (replaces manual `source .env.native.*` + `ios:sync`):

```bash
pnpm release:ios:bump-build          # every App Store Connect upload
pnpm release:ios:staging             # TestFlight → staging API
# or
pnpm release:ios:production          # App Store candidate → production API
pnpm release:ios:open
```

Then smoke on a physical iPhone and use **Product → Archive** in Xcode.

## TestFlight workflow

1. Enroll in the Apple Developer Program and create the App ID/App Store Connect record.
2. Configure Clerk, Apple, APNs, staging API CORS, Sentry, and all staging providers.
3. Run `pnpm release:ios:bump-build` then `pnpm release:ios:staging` (loads `.env.native.staging`, runs the native env gate, and `ios:sync`).
4. Open the workspace with `pnpm release:ios:open` and build Release for a generic iOS device or physical iPhone.
5. Test on a physical iPhone before archiving (matrix below).
6. Archive with **Product → Archive**, validate, and upload.
7. Complete App Privacy, privacy/support URLs, age rating, export compliance, screenshots, review notes, and a review account that exposes customer, owner, and admin behavior as appropriate.
8. Complete internal TestFlight, then external beta review if used.
9. Rebuild against production with `pnpm release:ios:production` (and bump build again) for the App Store candidate; repeat the smoke matrix. Never submit a staging-targeted archive.

## Required physical-device matrix

- Fresh install, upgrade, offline launch/failure recovery, safe areas, keyboard, dark/light mode
- Apple, Google, and email sign-in; sign-out; disabled account; account deletion request/cancel
- Customer browsing, guest/signed-in order, card browser return, pay at pickup, order tracking, appointment request
- Owner Business Hub, notifications, product/order/kitchen/appointment operations, Connect browser return, read-only subscription page
- Admin dashboard and authorization-negative checks
- Push registration, receipt, deep links, token removal on sign-out
- Privacy, Terms, Help, support email, external maps/social links

## Troubleshooting

| Symptom | Check |
|---|---|
| Blank or stale UI | Re-run `ios:sync`; verify bundled `public` assets and Release archive commit/build number |
| API/CORS failure | `VITE_API_BASE_URL`, API availability, and `NATIVE_ALLOWED_ORIGINS=capacitor://localhost` |
| Apple sign-in fails after the sheet (token rejected) | Clerk → Apple must have **"Use custom credentials"** on with a valid Services ID / Team ID / Key ID / .p8 whose audience matches bundle `com.lanetech.townhub`. Shared dev credentials will fail the `oauth_token_apple` exchange. Ensure a nonce is sent. |
| Apple first-time user: “not authorized” / “no account to transfer” | SignIn-first binds the token — get a **second** Apple sheet and SignUp with a fresh token (never transfer / reuse). Keep Production bot CAPTCHA off for Cap. |
| Apple returning user: “not authorized” after SignUp-first | SignUp burns the token for existing Apple IDs — use SignIn-first instead. |
| Web: signed in but no My Orders / List Your Business | `/api/auth/me` failed (often email already linked to another Clerk user ID after Apple creates a new identity). Check Network for `auth/me` 4xx/5xx; link Apple on the existing Clerk user or repair the DB id. |
| Apple sheet doesn't appear | Re-run `ios:sync` so the plugin's new `appleSignIn` method is registered, confirm the **Sign in with Apple** capability/entitlement is present, and rebuild. |
| Google button missing on iOS | Rebuild with this branch; Google is shown again via native GIDSignIn. |
| Google Sign-In config error on tap | Set `VITE_GOOGLE_IOS_CLIENT_ID` + `VITE_GOOGLE_SERVER_CLIENT_ID` in `.env.native.staging`, re-run `ios:sync`, and enable Clerk Google **custom credentials** with the Web client. |
| Google Sign-In sheet fails / no callback | Confirm `Info.plist` has `GIDClientID` and the reversed iOS client URL scheme; AppDelegate must call `GIDSignIn.sharedInstance.handle(url)`. |
| Signed out whenever the app is closed | Confirm the native bundle initializes Clerk with `standardBrowser: false` and includes the Keychain-backed Clerk client-token transport, then rebuild and reinstall/update the TestFlight app. A web deploy alone cannot change the bundled Clerk configuration. |
| `x.map` / `x.filter` is not a function on native | List API payload wasn’t an array. Public pages use `asArray()`. Re-check Cap Cookies/Http are disabled. |
| Generic “TownHub” branding / empty home data / “Loading sign-in…” forever | Native bundle missing `VITE_API_BASE_URL` and/or baked-in `VITE_CLERK_PROXY_URL` from root `.env`. Source `.env.native.staging` (see `.env.native.staging.example`), confirm `ios:sync` preflight passes, rebuild from Xcode. Home should show **ClayTownHub** when API is reachable. |
| Stripe return fails | API `APP_BASE_URL`, browser callback, pending token propagation, and webhook delivery |
| Push fails | App ID/profile capability, APNs environment/key/team/bundle ID, device token registration |
| Store billing buttons appear | Release env gate and `VITE_DISTRIBUTION_CHANNEL=app-store` |

## Project layout

```text
artifacts/townhub/
├── capacitor.config.ts
├── ios/App/App.xcworkspace
├── ios/App/App/App.entitlements
├── ios/App/App/PrivacyInfo.xcprivacy
├── src/lib/capacitor-shell.ts
├── src/lib/distribution-channel.ts
└── dist/public/                  # copied into iOS by cap sync
```
