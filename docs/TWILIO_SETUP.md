# Twilio SMS Setup

TownHub sends **owner-only** SMS alerts through [Twilio](https://www.twilio.com) when configured. Without Twilio, SMS notifications are still logged to the database but **not delivered** (status `LOGGED`).

SMS is optional. Email can work independently.

## What TownHub sends

See **[NOTIFICATIONS.md](./NOTIFICATIONS.md)** for the full order lifecycle flow.

| Event | Recipient | When |
|-------|-----------|------|
| Order lifecycle updates | Customer | When email/phone provided at checkout |
| New order | Business owner | Owner enabled **Text me for new orders** and has a notification phone |
| New appointment request | Business owner | Owner enabled **Text me for appointment requests** and has a notification phone |

Implementation: `artifacts/api-server/src/lib/sms.ts`, `notification-sms.ts`, and `notification-delivery.ts`.

---

## 1. Create a Twilio account

1. Sign up at [twilio.com](https://www.twilio.com).
2. Complete account verification (phone and billing as required by Twilio).

**Trial accounts:** You can only send SMS to [verified recipient numbers](https://www.twilio.com/docs/messaging/guides/how-to-use-your-free-trial-account) until you upgrade. Fine for dev; upgrade before production launch.

---

## 2. Get Account SID and Auth Token

1. Open [Twilio Console](https://console.twilio.com/).
2. On the dashboard **Account Info** panel, copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click to reveal)

Store both in deployment secrets. **Never commit them to git.**

To rotate credentials later: create a new Auth Token in the console, update secrets, restart the API, then revoke the old token.

---

## 3. Provision a sending phone number

TownHub sends from a single platform number configured in `TWILIO_FROM_NUMBER`.

1. Twilio Console → **Phone Numbers** → **Manage** → **Buy a number** (or use a trial number).
2. Choose a number with **SMS** capability.
3. Copy the number in **E.164** format (e.g. `+15551234567`).

Use this value for `TWILIO_FROM_NUMBER`.

**US production note:** Sending SMS to US numbers from a local/long-code number typically requires [A2P 10DLC registration](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc). Start registration early — it can take days. Twilio’s console will guide you through brand and campaign setup.

---

## 4. Set environment variables

All three variables are required for SMS to be considered configured:

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `TWILIO_ACCOUNT_SID` | Yes | `ACxxxxxxxx...` | From Account Info |
| `TWILIO_AUTH_TOKEN` | Yes | `(secret)` | From Account Info — treat as a password |
| `TWILIO_FROM_NUMBER` | Yes | `+15551234567` | E.164 format, SMS-capable Twilio number |

Add to `.env` locally or your host’s secret store:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+15551234567
```

If any variable is missing, SMS is treated as **not configured** and no messages are sent.

---

## 5. Configure each business (owner settings)

Platform Twilio credentials are global. Each business chooses whether to receive SMS and where:

1. Business owner → **Settings → Notifications**.
2. Set **Notification phone (SMS)** in E.164 format (e.g. `+15558675309`).
3. Enable:
   - **Text me for new orders**, and/or
   - **Text me for appointment requests** (appointment storefronts only).

SMS is only sent when **both** platform Twilio env vars are set **and** the business has opted in with a valid phone number.

---

## 6. Deploy and restart

After setting secrets, redeploy or restart the API server.

On Replit: add all three `TWILIO_*` variables under **Secrets**, then republish or restart the workflow.

---

## 7. Verify before launch

### Admin System Status

1. Sign in as an **admin**.
2. Open **Admin → System Status**.
3. Confirm **SMS** shows **Healthy** with provider `twilio`.

If it shows **Not configured**, check that all three env vars are set and the API was restarted.

### Send a test alert

1. Configure a test business with your mobile number as **Notification phone**.
2. Enable **Text me for new orders**.
3. Place a test order on that business’s storefront.
4. Confirm the SMS arrives (trial accounts: recipient must be a verified number in Twilio).

### Notification logs

1. **Admin → System Status** shows recent notification logs.
2. Successful SMS shows channel **`SMS`** and status **`SENT`**. Missing provider shows **`LOGGED`**. Twilio errors show **`FAILED`** with a safe error message (no auth tokens in the log).

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| SMS status **Not configured** in System Status | Missing one or more `TWILIO_*` env vars |
| Logs show `LOGGED`, not `SENT` | Twilio not configured, or business SMS toggle off, or no notification phone |
| Twilio error 21211 | Invalid `to` number — use E.164 on the business notification phone |
| Twilio error 21608 / unverified number | Trial account — verify the recipient in Twilio Console |
| Message blocked / 30034 | US A2P 10DLC not registered — complete Twilio compliance setup |
| Logs show `FAILED` | Wrong Auth Token, suspended account, or invalid from number — check Twilio **Monitor → Logs → Messaging** |

Check API server logs for `[operational] sms_send_failed` or `order_notification_sms_failed`. Operational logs never include auth tokens or full phone numbers beyond what’s needed for debugging.

---

## Related docs

- [STRIPE_SETUP.md](./STRIPE_SETUP.md) — card payments
- [NOTIFICATIONS.md](./NOTIFICATIONS.md) — full order notification flow
- [RESEND_SETUP.md](./RESEND_SETUP.md) — email notifications
- [PRODUCTION.md](../PRODUCTION.md) — full production checklist
- [PRODUCTION_MONITORING.md](./PRODUCTION_MONITORING.md) — health checks and operational logging
