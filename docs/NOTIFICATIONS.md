# TownHub Notifications

Canonical reference for TownHub’s cross-platform notification system.

TownHub sends notifications when meaningful **business events** happen — not when raw database status labels change internally. Delivery is fire-and-forget: notifications never block API responses. Attempts are logged to `notification_logs` (viewable in **Admin → System Status**).

---

## Architecture overview

One backend pipeline decides **who**, **what**, and **which channels**. Platform-specific providers (APNs, FCM, Web Push, email, SMS, ntfy, Discord) are adapters behind that pipeline.

```text
Domain event (order status, appointment, application, …)
        │
        ▼
Orchestrators (notification-service / notifications / application-notifications / …)
        │  resolve recipients + category + content
        ▼
Channel adapters
        ├── EMAIL   → Resend / SMTP
        ├── SMS     → Twilio
        ├── DISCORD → owner webhook
        ├── NTFY    → ntfy server
        └── PUSH    → push provider registry
                ├── IOS     → APNs
                ├── ANDROID → FCM (stub; ready to implement)
                └── WEB     → Web Push (stub; ready to implement)
        │
        ▼
notification_logs (+ automatic invalid device-token cleanup for PUSH)
```

**Do not** duplicate notification business logic per platform. Add new event types in orchestrators; add new delivery tech as a push/provider adapter.

Related docs (narrower topics):

- [BUSINESS_HUB_LIVE_NOTIFICATIONS.md](./BUSINESS_HUB_LIVE_NOTIFICATIONS.md) — in-browser SSE/toasts while Business Hub is open
- [SUBSCRIPTION_NOTIFICATIONS.md](./SUBSCRIPTION_NOTIFICATIONS.md) — subscription lifecycle email details
- [RESEND_SETUP.md](./RESEND_SETUP.md) / [TWILIO_SETUP.md](./TWILIO_SETUP.md)

---

## Notification pipeline

1. **Event occurs** in a route, webhook, or job (e.g. order `CONFIRMED`, new application).
2. **Orchestrator** loads context (order, business, recipients) and builds channel-specific copy.
3. **Category** is derived via `categoryForEventType()` (`notification-categories.ts`).
4. **Preferences** gate authenticated PUSH delivery (`user_notification_preferences`). Business channel toggles (email/SMS/Discord/ntfy) still live on `businesses`.
5. **Adapters** send in parallel; failures are logged, not thrown to the API client.
6. **Deep link** (path or HTTPS URL) is included so taps open the right screen.

| Layer | Location |
| ----- | -------- |
| Categories + event map | `artifacts/api-server/src/lib/notification-categories.ts` |
| Deep links | `notification-deep-links.ts`, `notification-urls.ts` |
| Push copy | `notification-push-copy.ts` |
| Push delivery | `push-delivery.ts` + `lib/push/*` |
| Email/SMS/Discord/ntfy | `notification-delivery.ts` |
| Order orchestration | `notification-service.ts` |
| Appointments | `notifications.ts` |
| Applications / admin | `application-notifications.ts` |
| Subscriptions | `subscription-notifications.ts` |

---

## Delivery providers

| Channel | Provider | Status |
| ------- | -------- | ------ |
| EMAIL | Resend (preferred) or SMTP | Production |
| SMS | Twilio | Production |
| DISCORD | Per-business webhook | Production |
| NTFY | Public/self-hosted ntfy (owner topic) | Production |
| PUSH / iOS | APNs (token auth, `.p8`) | Production-ready when env set |
| PUSH / Android | FCM | Adapter stub — env reserved |
| PUSH / Web | Web Push (VAPID) | Adapter stub — env reserved |

When a provider is not configured, delivery is logged with status `LOGGED` so copy and routing can be verified without sending.

Logged `channel` values: `EMAIL` | `SMS` | `DISCORD` | `NTFY` | `PUSH`.

---

## Device registration flow

1. User signs in on the Capacitor iOS (or future Android) app.
2. `NativePushRegistration` requests notification permission via `@capacitor/push-notifications`.
3. On APNs/FCM registration success, the client `POST`s to `/api/devices` with `{ token, platform, appVersion }`.
4. Backend upserts `device_tokens` for that authenticated user (token unique globally; reassign if the device moves accounts).
5. `lastSeenAt` is refreshed on re-registration.
6. On logout, the client `DELETE`s `/api/devices` with the current token (best-effort) before Clerk `signOut`.
7. Invalid/expired tokens returned by APNs (`410`, `BadDeviceToken`, `Unregistered`, …) are deleted automatically.

### Device API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/devices` | Register / refresh token |
| `GET` | `/api/devices` | List devices (tokens redacted) |
| `DELETE` | `/api/devices` | Unregister `{ token }` or `{ all: true }` |

Platform enum: `IOS` | `ANDROID` | `WEB`.

---

## Database / schema changes

### `device_tokens`

| Column | Notes |
| ------ | ----- |
| `user_id` | Clerk user id (FK → `users`) |
| `token` | Unique APNs/FCM/Web Push token |
| `platform` | `IOS` \| `ANDROID` \| `WEB` |
| `app_version` | Optional client version |
| `device_label` | Optional label |
| `last_seen_at` | Updated on register |

### `user_notification_preferences`

| Column | Notes |
| ------ | ----- |
| `user_id` + `category` | Unique; absence = category default (`enabled`) |
| `enabled` | Per-category opt-out/in |

### `notification_logs`

- `channel` may be `PUSH`
- `recipient_user_id` set for push deliveries

Schema is Drizzle push-based:

```bash
pnpm --filter @workspace/db run push
```

---

## Notification categories

Categories are the unit of **user preference** and push routing. Audience: Platform Admin, Business Owner, Customer.

### Platform admin

| Key | Implemented | Trigger examples |
| --- | ----------- | ---------------- |
| `ADMIN_NEW_APPLICATION` | Yes | New business application |
| `ADMIN_CRITICAL_ALERT` | Yes | Trial/paid admin subscription notices |
| `ADMIN_PAYMENT_FAILURE` | Yes | Admin payment failed / canceled / expired |
| `ADMIN_JOB_FAILURE` | No (reserved) | Background job failures |

### Business owners

| Key | Implemented | Trigger examples |
| --- | ----------- | ---------------- |
| `OWNER_NEW_ORDER` | Yes | New order |
| `OWNER_ORDER_CANCELED` | No | Order canceled |
| `OWNER_APPOINTMENT_REQUEST` | Yes | Appointment request |
| `OWNER_CUSTOMER_MESSAGE` | No | Customer message |
| `OWNER_STRIPE_ISSUE` | Yes | Refund failed / Stripe issues |
| `OWNER_LOW_INVENTORY` | No | Low inventory |
| `OWNER_SUBSCRIPTION` | Yes | Owner subscription / application outcome emails |

### Customers

| Key | Implemented | Trigger examples |
| --- | ----------- | ---------------- |
| `CUSTOMER_ORDER_ACCEPTED` | Yes | Status → `CONFIRMED` |
| `CUSTOMER_ORDER_READY` | Yes | Ready / out for delivery |
| `CUSTOMER_ORDER_COMPLETED` | Yes | Completed |
| `CUSTOMER_ORDER_UPDATES` | Yes | Received, preparing, cancelled, refund |
| `CUSTOMER_APPOINTMENT_DECISION` | Yes | Appointment confirmed / declined |
| `CUSTOMER_APPOINTMENT_REMINDER` | No | Appointment reminders |
| `CUSTOMER_EVENT_REMINDER` | No | Event reminders |

Business **channel** settings (email address, SMS toggles, Discord webhook, ntfy topic) remain on the business record and are independent of category preferences. Category preferences primarily gate **PUSH** (and future authenticated channels) for signed-in users.

---

## User notification preferences

- API: `GET` / `PUT` `/api/me/notification-preferences`
- UI: Business Hub → **Notifications** → “Push & in-app categories”
- Defaults: all implemented categories **enabled** until the user opts out

Test push (signed-in): `POST /api/me/notifications/test-push`

---

## Deep-link behavior

Push payloads include string data:

| Field | Example |
| ----- | ------- |
| `deepLink` | `/dashboard/business/orders/42` |
| `category` | `OWNER_NEW_ORDER` |
| `eventType` | `NEW_ORDER` |
| `orderId` / `appointmentRequestId` / `businessId` | numeric strings |

Native tap handling (`native-push.ts`) navigates the WebView to the deep link path (or resolves `townhub://…` / absolute HTTPS into the app origin).

HTTPS links in email / SMS / ntfy continue to use `APP_BASE_URL` helpers in `notification-urls.ts`.

| Target | Path |
| ------ | ---- |
| Customer order | `/order/{id}` |
| Owner order | `/dashboard/business/orders/{id}` |
| Appointments | `/dashboard/business/appointments` |
| Business hub | `/dashboard/business` |
| Subscription | `/dashboard/business/subscription` |
| Admin applications | `/dashboard/admin/applications` |
| Event | `/events/{id}` |

---

## Order notification flow (email / SMS + push)

```text
Customer checkout
       │
       ├─ Pay at pickup ──► ORDER_RECEIVED (email + SMS + customer push)
       │
       └─ Card (Stripe) ──► payment webhook marks PAID ──► ORDER_RECEIVED

Business owner ──► NEW_ORDER (email/SMS/Discord/ntfy per business + owner push)

Business updates status ──► lifecycle email + SMS + customer push
```

| Order status | Customer event |
| ------------ | -------------- |
| *(checkout / webhook)* | `ORDER_RECEIVED` |
| `CONFIRMED` | `ORDER_ACCEPTED` |
| `PREPARING` | `ORDER_PREPARING` |
| `READY_FOR_PICKUP` | `ORDER_READY_FOR_PICKUP` |
| `OUT_FOR_DELIVERY` | `ORDER_OUT_FOR_DELIVERY` |
| `COMPLETED` | `ORDER_COMPLETED` |
| `CANCELED` | `ORDER_CANCELLED` |

Customer PUSH requires a signed-in `customerUserId` on the order. Guests still receive email/SMS when contact info is present.

---

## Platform support

| Platform | Delivery | Client |
| -------- | -------- | ------ |
| **iOS** | APNs via Capacitor Push Notifications | Implemented |
| **Android** | FCM adapter stub | Same `/api/devices` + registry; wire FCM sender when ready |
| **Web** | Web Push stub | Same preferences + future service worker |
| **Email / SMS / ntfy / Discord** | Existing adapters | Unchanged |

### iOS (Capacitor + APNs)

1. Apple Developer: App ID with **Push Notifications**; create an APNs Auth Key (`.p8`).
2. Xcode: enable **Push Notifications** capability (and Background Modes → Remote notifications — `UIBackgroundModes` includes `remote-notification` in `Info.plist`).
3. Set API env vars (below), then `pnpm --filter @workspace/db run push`.
4. `pnpm --filter @workspace/townhub run ios:sync` so `@capacitor/push-notifications` is linked.
5. Sign in on a **physical device** (simulator APNs is limited), accept permission, confirm a row in `device_tokens`.
6. Place a test order / use `POST /api/me/notifications/test-push`.

See also [IOS_APP.md](./IOS_APP.md).

### Android (future — FCM)

1. Create a Firebase project; download `google-services.json`.
2. Implement HTTP v1 send in `lib/push/fcm-provider.ts` (adapter already selected for `ANDROID`).
3. Set `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`.
4. Capacitor Android app registers with the same `POST /api/devices` (`platform: "ANDROID"`).

### Web Push (future)

1. Generate VAPID keys; set `WEB_PUSH_VAPID_*` env.
2. Implement sender in `lib/push/web-push-provider.ts`.
3. Add service worker subscription → `POST /api/devices` (`platform: "WEB"`).

---

## Free phone notifications (ntfy)

Owners can still use [ntfy](https://ntfy.sh) for free phone alerts without App Store push. Configure in Business Hub → Notifications. Server: `NTFY_SERVER_URL` (default `https://ntfy.sh`). Topics are per-business and independent of `device_tokens`.

---

## Required environment variables

| Variable | Purpose |
| -------- | ------- |
| `APP_BASE_URL` | HTTPS links in email/SMS/ntfy |
| `RESEND_API_KEY` / `RESEND_FROM` or `SMTP_*` | Email |
| `TWILIO_*` | SMS |
| `NTFY_SERVER_URL` | ntfy base URL |
| `PLATFORM_ADMIN_EMAIL` | Optional admin inbox override |
| `APNS_KEY_ID` | APNs key id |
| `APNS_TEAM_ID` | Apple Developer Team ID |
| `APNS_BUNDLE_ID` | Default `com.lanetech.townhub` |
| `APNS_PRIVATE_KEY` or `APNS_PRIVATE_KEY_PATH` | `.p8` PEM (`\n` escaped if inline) |
| `APNS_PRODUCTION` | `true` for production APNs; otherwise sandbox |
| `FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` | Future Android |
| `WEB_PUSH_VAPID_PUBLIC_KEY` / `WEB_PUSH_VAPID_PRIVATE_KEY` / `WEB_PUSH_VAPID_SUBJECT` | Future Web Push |

---

## Testing procedures

```bash
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/townhub run test
```

Checklist:

- [ ] Schema pushed (`device_tokens`, `user_notification_preferences`, `recipient_user_id`)
- [ ] Pay at pickup — customer email/SMS (+ push if signed in)
- [ ] Stripe card — `ORDER_RECEIVED` only after webhook `PAID`
- [ ] Owner new order — existing channels + push to `business.ownerId` devices
- [ ] Status changes map to the correct customer events / categories
- [ ] Preference disable — category does not send PUSH for that user
- [ ] Device register after login; unregister on logout
- [ ] Invalid APNs tokens removed from `device_tokens`
- [ ] Notification tap opens the correct deep link
- [ ] ntfy / Discord / email / SMS still work when APNs unset
- [ ] Admin application submitted emails + admin push

---

## Deployment steps

1. Set notification-related env on the API host (including APNs for iOS push).
2. `pnpm --filter @workspace/db run push` against production DB.
3. Deploy API + frontend.
4. Rebuild/sync iOS (`ios:sync`), enable Push capability, ship TestFlight/App Store build.
5. Verify with a signed-in device: register → test push → real order event.
6. Monitor **Admin → System Status** notification logs (`PUSH` channel).

---

## Future expansion points

- Implement FCM send body in `fcm-provider.ts` without changing orchestrators.
- Implement Web Push in `web-push-provider.ts`.
- Wire reserved categories (`OWNER_LOW_INVENTORY`, appointment/event reminders, job failures).
- Multi-staff recipients beyond `business.ownerId`.
- Richer customer appointment deep links when a dedicated screen exists.
- Optional admin UI filters for `PUSH` in the notification log panel.
