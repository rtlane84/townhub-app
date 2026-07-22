# App Store Privacy Questionnaire (IOS-004)

> Operational record. Review this for each App Store submission; use [IOS_APP.md](IOS_APP.md) for the current release process.

Owner review draft for App Store Connect → **App Privacy**. Implementation in-repo is wired; this document is the disclosure checklist to enter (and eventually sign off).

**Do not treat this as formal legal advice.** Confirm answers against current product behavior before submission.

## Public URLs (App Information)

| Field | Value |
|---|---|
| Privacy Policy URL | `https://townhub.io/privacy-policy` |
| Terms of Use (EULA) URL | `https://townhub.io/terms-of-service` (optional Apple standard EULA vs custom) |
| Support URL | Help Center on-site + contact `Ronnie@LaneTechWV.com` (use a stable HTTPS help or contact page when Connect requires a URL) |

Staging mirrors: `https://staging.townhub.io/privacy-policy`, `/terms-of-service`.

## Tracking

| Question | Answer | Rationale |
|---|---|---|
| Does this app use data for tracking? | **No** | No ATT / IDFA / cross-app advertising. `NSPrivacyTracking` is `false`. Better Stack / Sentry is crash and error diagnostics, not advertising tracking. |
| Privacy Nutrition Label “Data Used to Track You” | **None** | — |

## Data collection overview

Answer **Yes, we collect data from this app** (accounts, orders, push, diagnostics, media).

For every type below: **Linked to the user = Yes**, **Used for tracking = No**, unless noted.

| App Store category | Collect? | Purposes | Notes |
|---|---|---|---|
| Name | Yes | App Functionality | Profile / orders / appointments |
| Email Address | Yes | App Functionality | Account + guest checkout / order contact |
| Phone Number | Yes | App Functionality | Optional order / business contact |
| Physical Address | Yes | App Functionality | Delivery addresses when used |
| User ID | Yes | App Functionality | Clerk / TownHub account id |
| Device ID | Yes | App Functionality | APNs device tokens for push |
| Purchase History | Yes | App Functionality | Orders / payment status (not full PAN) |
| Photos or Videos | Yes | App Functionality | Business / town media uploads |
| Other User Content | Yes | App Functionality | Products, notes, appointments, listings |
| Crash Data | Yes | App Functionality, Analytics | Sentry/Better Stack Errors |
| Payment Info | **No** (recommended) | — | Card numbers enter Stripe Checkout / Connect hosted UI; TownHub stores payment status + provider ids, not full card data. If Apple’s UI forces a payment row, declare only what leaves the device and say not used for tracking. |
| Precise / Coarse Location | **No** (device GPS) | — | No Core Location permission strings in `Info.plist`. Business / food-truck coordinates are owner-entered listing data (covered under Other User Content / address as applicable), not device location services. |
| Contacts, Health, Financial Info (bank), Browsing History, Search History, Advertising Data | **No** | — | Not collected for those Apple buckets |

Third parties that process data for you (disclose as shared with processors / service providers where Connect asks): **Clerk** (identity), **Stripe** (payments), **Supabase/Postgres host** (database), **Cloudflare** (frontend), **Railway** (API), **Resend/Twilio** (email/SMS when configured), **APNs** (push), **Better Stack** (errors/logs/uptime). Do not list them as “selling” data.

## Age rating / kids

- TownHub is **not directed to children under 13** (stated in privacy policy).
- Age Rating questionnaire: no unrestricted web content that would force 17+ solely for that reason beyond normal marketplace content; complete honestly for user-generated business content if asked.

## Export compliance / encryption

- Standard HTTPS / TLS. Typically **exempt** encryption questionnaire path (HTTPS only). Confirm at upload time with Xcode prompts.

## In-app code / metadata checks (already in repo)

| Item | Location | Status |
|---|---|---|
| Privacy manifest | `artifacts/townhub/ios/App/App/PrivacyInfo.xcprivacy` | Present; no tracking; UserDefaults CA92.1; collected types aligned below |
| Account deletion | Account page + API + runbook | Live |
| Privacy / Terms routes | `/privacy-policy`, `/terms-of-service` | Bundled + deployed on production |
| Compliance unit tests | `app-store-compliance.test.ts` | Asserts routes, Apple sign-in wiring, tracking off |

## App Store Connect status

**Published 2026-07-15** on app **TownHub Local** (`6791258844`) by Ronald Lane.

Product page preview buckets: Contact Info, User Content, Purchases, Identifiers, Diagnostics under **Data Linked to You**; **Device ID** currently appears under **Data Not Linked to You** (if that was intentional for APNs-only device tokens, leave it; otherwise Edit Device ID → linked **Yes** and re-publish).

Owner checklist:

1. [ ] Read [privacy-policy](https://townhub.io/privacy-policy) and [terms](https://townhub.io/terms-of-service); edit copy if counsel requires changes.
2. [ ] Confirm support contact `Ronnie@LaneTechWV.com` is monitored (or replace with preferred address in policy + Connect).
3. [x] Enter the table above into App Store Connect → App Privacy and **Publish**.
4. [ ] After first Release archive, run Xcode **Generate Privacy Report** and reconcile any SDK declarations (Clerk / Capacitor / Sentry) with Connect answers.
5. [x] Owner publish in Connect serves as the dated acceptance of these disclosures (2026-07-15).

Counsel review is optional but recommended before App Store submission. Connect Privacy is filled for TestFlight metadata; remaining items above are soft follow-ups.
