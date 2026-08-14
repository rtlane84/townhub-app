# TownHaven rebrand rollout runbook

This runbook coordinates the TownHub-to-TownHaven web, API, provider, and iOS transition. Repository changes prepare the product; domain purchase, provider dashboards, deployment, TestFlight, and App Store submission remain operator actions.

## Invariants

- Keep the existing App Store Connect record, bundle ID `com.lanetech.townhub`, Apple/Google native application configuration, APNs topic, signing entitlements, and `townhub://` callback scheme.
- Keep internal workspace/package paths and existing browser-storage keys so upgrades do not lose state.
- Serve `api.townhub.io` and `api.townhaven.io` from the same production API and database during the compatibility period.
- Do not retire `api.townhub.io` merely because the new app is released; old installed native bundles continue calling it.
- Preserve old webhook destinations until delivery is verified at the new destinations.
- Do not submit a staging-targeted archive to App Review.

## 1. Ownership and naming gates

- [ ] Complete and acknowledge [TOWNHAVEN_CLEARANCE_SCREEN.md](./TOWNHAVEN_CLEARANCE_SCREEN.md).
- [x] Purchase `townhaven.io`. Domain ownership and Cloudflare DNS control were confirmed August 13, 2026; registrar MFA, auto-renewal, and account recovery remain an owner account check.
- [x] Confirm App Store Connect accepts **TownHaven** on the next editable iOS version. Confirmed August 10, 2026 on the existing app record's iOS 1.0.1 draft; the live 1.0 version remains unchanged.
- [ ] Record ownership/licensing for the retained TH logo and app icon.

## 2. Provision domains without cutting traffic

- [x] Add Cloudflare DNS/TLS and service custom domains for:
  - `townhaven.io` and `www.townhaven.io`
  - `staging.townhaven.io`
  - `api.townhaven.io`
  - `api-staging.townhaven.io`
- [x] Keep `api.townhub.io` attached to the production Railway API. Verified HTTP 200 alongside `api.townhaven.io` on August 13, 2026.
- [ ] Configure the old web domains to redirect to the equivalent TownHaven path and query string. Verify signed guest-order links retain their `token` parameter without logging it.
- [ ] Add the legacy API health check to external monitoring and track request volume separately when provider tooling permits.

## 3. Update runtime and provider configuration

Apply staging first, validate it, then repeat for production.

- [ ] API/web environment: `APP_BASE_URL`, `FRONTEND_BASE_URL`, `VITE_API_BASE_URL`, `VITE_PUBLIC_WEB_URL`, `PLATFORM_URL`, `APP_NAME`, and allowed browser origins.
- [ ] Clerk: proxy/custom domain, allowed origins, sign-in/sign-up redirects, native HTTPS return bridge, and production/staging separation.
- [ ] Apple: private-email relay sender domains. Do not change the native bundle ID or Sign in with Apple application relationship.
- [ ] Google: web OAuth origins/redirects. Do not replace the native iOS OAuth client solely for the rebrand.
- [ ] Stripe: Checkout/Connect/Billing return URLs and both webhook-domain routes. Keep old webhook endpoints enabled until new delivery is verified.
- [ ] Resend/email: verify the new sending domain, change the visible sender to TownHaven, and configure support/inbound routing.
- [ ] Twilio: update brand, website, privacy, terms, and opt-in evidence in the toll-free/A2P records as applicable.
- [ ] Better Stack/Sentry, Plausible, uptime monitoring, notification links, and operational dashboards.
- [ ] Set Admin → Platform Settings → Platform name to `TownHaven` in staging and production.

## 4. Staging and TestFlight

Local validation on August 10, 2026: full typecheck, frontend and API test suites, production web/API build, codebase health audit, and `git diff --check` passed. On August 13, 2026, `townhaven.io`, `www.townhaven.io`, and `api.townhaven.io` were activated alongside the legacy production hosts. The private production native settings were changed to the TownHaven hosts, `pnpm release:ios:production` passed, and bundle inspection confirmed `api.townhaven.io`, `townhaven.io`, the `app-store` channel, and the `TownHaven` display name. No archive has been uploaded yet.

- [ ] Deploy staging web/API with the new hosts and run the documented smoke tests.
- [ ] Prepare the native staging bundle with `.env.native.staging`; verify it contains `api-staging.townhaven.io`, `staging.townhaven.io`, and the `app-store` channel.
- [ ] Test a fresh install and an upgrade from the live TownHub app on a physical iPhone.
- [ ] Exercise Apple, Google, and email sign-in; customer orders; Stripe browser returns; owner/admin workflows; push/deep links; legal/support pages; and account deletion.
- [ ] Distribute to internal TestFlight and, if desired, the existing external group.

## 5. App Store Connect metadata

- [ ] Create the next patch version on the existing app record and select the TownHaven production build. The iOS 1.0.1 draft exists; no build has been selected yet.
- [x] App name: **TownHaven**. Saved successfully on the iOS 1.0.1 draft on August 10, 2026.
- [ ] Replace TownHub in subtitle, description, promotional text, keywords, beta description, review information, and support/marketing/privacy URLs.
- [ ] Upload new screenshots showing TownHaven and fictional customer/business data.
- [ ] Suggested What's New: `TownHub is now TownHaven. This update introduces our new name and website while preserving your account, businesses, orders, subscriptions, and existing app experience.`
- [ ] Review notes: explain that this is a trademark-driven brand/domain update to the same local-commerce service; provide working customer, owner, and admin review credentials; explain physical-goods checkout and web-managed owner SaaS billing.
- [ ] Reconfirm App Privacy, age rating, export compliance, privacy manifest, account deletion, and support contact accuracy.
- [ ] Select manual release after approval.

## 6. Coordinated production release

1. Configure production to accept both old and new domain families.
2. Upload and submit the production iOS archive, then wait for approval in Pending Developer Release.
3. Repeat and record the TownHaven name screen.
4. Deploy the production web/API configuration and make `townhaven.io` canonical.
5. Verify old-web redirects, both API hostnames, Clerk, Stripe, Resend, notifications, monitoring, and guest links.
6. Release the approved iOS version to all users rather than using a phased release that prolongs the old visible brand.
7. Notify customers and businesses that the name changed but accounts, businesses, orders, and subscriptions did not.

## 7. Monitoring and legacy retirement

- Monitor authentication failures, checkout/webhook failures, notification delivery, crashes, old API hostname traffic, and support contacts daily during the initial release window.
- Keep old DNS, TLS, API routing, and provider callbacks operational while old native builds remain active.
- Retire the legacy API hostname only after measured traffic is negligible or a tested minimum-version/update-required flow is released. Document the evidence and rollback plan before removal.
