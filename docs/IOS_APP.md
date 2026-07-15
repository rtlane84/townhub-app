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

The API must allow the fixed bundled WebView origin:

```bash
NATIVE_ALLOWED_ORIGINS=capacitor://localhost
```

Validate the selected environment before syncing:

```bash
pnpm run release:check-env -- --environment staging --component native
pnpm --filter @workspace/townhub run ios:sync
```

`ios:sync` builds the Vite application and copies `dist/public` into the native project. Any React code, help copy, legal copy, build-time variable, Capacitor configuration, plugin, entitlement, or bundled asset change requires a new iOS build and App Store Connect upload. A website deploy alone does not update an installed app.

## Environment targeting

- Internal and early external TestFlight builds target the isolated staging API and web OAuth bridge.
- The App Store release candidate is rebuilt from the approved commit with production API/web values.
- Increment `CURRENT_PROJECT_VERSION` for every App Store Connect upload.
- Never submit a staging-targeted archive as the production App Store version.

See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for the full isolation matrix.

## Authentication

Native sign-in offers Apple, Google, and email:

- Apple OAuth stays in the Capacitor WebView and returns through `https://<public-web>/native-sso-callback` → `capacitor://localhost/sso-callback?…` (query preserved). Google uses Cap Browser / Safari (WKWebView blocks Google) and falls back to path-encoded `townhub://sso-callback/p/…` → bundled `/sso-callback`.
- Email/password uses Clerk UI in the WebView.
- Configure the production and staging callback URLs in their matching Clerk instances.
- Enable Apple for sign-in and sign-up, add the Clerk native application with the Apple App ID prefix and bundle ID, enable the **Sign in with Apple** capability, and configure Apple private-email relay for TownHub sender domains.
- Test Apple first-time consent, Hide My Email, returning users, canceled auth, and sign-out on a physical device.

TownHub uses in-WebView Clerk OAuth for Apple and the system-browser bridge for Google. Validate both on a physical device during TestFlight review preparation. If Clerk or Apple requires the native Authentication Services token exchange for this application configuration, that is a release blocker—not a reason to remove Apple login.

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

## TestFlight workflow

1. Enroll in the Apple Developer Program and create the App ID/App Store Connect record.
2. Configure Clerk, Apple, APNs, staging API CORS, Sentry, and all staging providers.
3. Run repository release gates and the native environment check.
4. Run `ios:sync`, open the workspace, and build Release for a generic iOS device.
5. Test on a physical iPhone before archiving.
6. Archive with **Product → Archive**, validate, and upload.
7. Complete App Privacy, privacy/support URLs, age rating, export compliance, screenshots, review notes, and a review account that exposes customer, owner, and admin behavior as appropriate.
8. Complete internal TestFlight, then external beta review if used.
9. Rebuild against production for the App Store candidate and repeat the smoke matrix.

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
| OAuth fails | `VITE_PUBLIC_WEB_URL`, Clerk mobile SSO allowlist (`townhub://sso-callback` + `https://…/native-sso-callback`), Apple/Google connection, custom scheme, physical-device logs. Instance `allowed_origins` must include `capacitor://localhost` (PATCH `/v1/instance`). CapacitorCookies may be enabled for WKWebView; do not enable CapacitorHttp globally (breaks Clerk fetch). |
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
