# Resend Email Setup

TownHub sends transactional email through [Resend](https://resend.com) when configured. Without it, notifications are still written to the database but **not delivered** (status `LOGGED`).

Resend is preferred over SMTP when `RESEND_API_KEY` is set.

## What TownHub sends

See **[NOTIFICATIONS.md](./NOTIFICATIONS.md)** for the full order lifecycle flow (customer email/SMS, business alerts, triggers, and link rules).

Summary:

| Event | Recipient | Channel |
|-------|-----------|---------|
| Order received | Customer | Email + SMS (when contact info provided) |
| Order status change | Customer | Email + SMS per lifecycle event |
| New order | Business owner | Email / SMS / Discord / ntfy when that channel’s **Enable** is on |
| New appointment request | Business owner | Same channels when Enable is on and appointments are enabled |
| Refund failed / Stripe Connect issue | Business owner | **Email + TownHub app push only** (mandatory; ignores Email Enable) |

Operational owner alerts are configured under **Business Hub → Notifications** (one Enable per channel). Critical payment alerts cannot be turned off there — see [NOTIFICATIONS.md](./NOTIFICATIONS.md#critical-stripe--payment-alerts).

Implementation: `artifacts/api-server/src/lib/notification-service.ts`, `email-templates/`, `notification-sms.ts`, and `notification-delivery.ts`.

---

## 1. Create a Resend account

1. Sign up at [resend.com](https://resend.com).
2. Complete account verification.

---

## 2. Verify your sending domain

Production email should come from **your** domain (e.g. `orders@yourtown.com`), not Resend’s shared test domain.

1. In Resend → **Domains** → **Add Domain**, enter your domain (e.g. `yourtown.com`).
2. Add the DNS records Resend shows (typically **DKIM** and **SPF**; follow the dashboard exactly for your DNS host).
3. Wait until the domain status is **Verified** (can take a few minutes to 48 hours depending on DNS propagation).

**Tips**

- Use a subdomain for transactional mail if you prefer (e.g. `mail.yourtown.com`) — add that subdomain in Resend instead of the apex domain.
- Until a domain is verified, Resend may only allow sending to your own account email. Plan domain verification before launch testing with real customers.

---

## 3. Create an API key

1. Resend → **API Keys** → **Create API Key**.
2. Name it for your environment (e.g. `townhub-production`).
3. Use **Sending access** (full access is not required for TownHub).
4. Copy the key once — it starts with `re_`.

Store the key in Railway environment variables. **Never commit it to git.**

---

## 4. Set environment variables

TownHub requires **both** variables for Resend to be considered configured:

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `RESEND_API_KEY` | Yes | `re_...` | API key from step 3 |
| `RESEND_FROM` | Yes | `TownHub <orders@yourtown.com>` | Must use an address on your **verified** domain |

Add to `.env` locally or your host’s secret store:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=TownHub <orders@yourtown.com>
```

`RESEND_FROM` may be a plain address (`orders@yourtown.com`) or include a display name as shown above.

If `RESEND_API_KEY` is set but `RESEND_FROM` is missing, email is treated as **not configured** and nothing is sent.

**SMTP fallback:** If you prefer SMTP instead, leave `RESEND_API_KEY` unset and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Resend takes priority when its API key is present.

**Customer problem reports:** `POST /api/support/reports` emails the support inbox. Set optional `SUPPORT_INBOX_EMAIL` to override the default (`Ronnie@LaneTechWV.com`). Delivery uses the same Resend/SMTP configuration.

---

## 5. Deploy and restart

After setting secrets, redeploy or restart the API server so `process.env` picks up the new values.

Add both variables to the selected Railway API environment, then redeploy or restart the API.

---

## 6. Verify before launch

### Admin System Status

1. Sign in as an **admin**.
2. Open **Admin → System Status**.
3. Confirm **Email** shows **Healthy** with provider `resend`.

If it shows **Not configured**, check that both `RESEND_API_KEY` and `RESEND_FROM` are set and the API was restarted.

### Send a real notification

1. Ensure a business has **Email** Enable on and a notification address under **Business Hub → Notifications**.
2. Place a test order on a storefront **or** update an order status as the business owner.
3. Confirm the email arrives (check spam if needed).

### Notification logs

1. **Admin → System Status** includes recent notification logs.
2. Successful sends show status **`SENT`**. Missing provider config shows **`LOGGED`**. Provider errors show **`FAILED`** with a safe error message (no API keys in the log).

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Email status **Not configured** in System Status | Missing `RESEND_FROM` or `RESEND_API_KEY` |
| Resend API error about domain / from address | `RESEND_FROM` domain not verified in Resend |
| Emails to customers fail; owner test works | Domain verified but from-address typo, or Resend still in restricted test mode |
| Logs show `LOGGED`, not `SENT` | No email provider configured — check env vars and restart |
| Logs show `FAILED` | Invalid API key, revoked key, or Resend rejection — check Resend dashboard → **Logs** |

Check API server logs for `[operational] email_send_failed` entries. Operational logs never include API keys or full message bodies.

---

## Related docs

- [STRIPE_SETUP.md](./STRIPE_SETUP.md) — card payments
- [TWILIO_SETUP.md](./TWILIO_SETUP.md) — SMS notifications
- [PRODUCTION.md](../PRODUCTION.md) — full production checklist
- [PRODUCTION_MONITORING.md](./PRODUCTION_MONITORING.md) — health checks and operational logging
