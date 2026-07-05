# Stripe Connect Payment Setup

TownHub uses **[Stripe Connect](https://stripe.com/docs/connect)** so each business receives card payments through its own connected Stripe account. The platform Stripe keys enable Connect onboarding and webhooks — **customer payments go to the business**, not a single shared TownHub balance.

Pay-at-pickup orders (`IN_PERSON`) never use Stripe and are not marked paid by webhooks.

---

## Two audiences


| Audience                              | What you configure                                                      |
| ------------------------------------- | ----------------------------------------------------------------------- |
| **Platform owner** (TownHub operator) | Stripe platform account, Connect, API keys, webhook endpoint            |
| **Business owner**                    | Connect their business via **Business Dashboard → Settings → Payments** |


---

## Part A — Platform owner setup

### 1. Create a Stripe account and enable Connect

1. Sign up at [stripe.com](https://stripe.com) and complete business verification.
2. **Enable Connect** — this is required before businesses can connect:
   - Open [Stripe Dashboard → Connect](https://dashboard.stripe.com/connect)
   - Complete the platform profile / Connect onboarding
   - Until this step is done, **Connect Stripe** in TownHub will fail with “Connect is not enabled”
3. Use **Test mode** while developing; switch to **Live mode** only when ready for real money.

TownHub creates **Express** connected accounts for businesses and runs **direct charges** on those accounts (Checkout sessions are created on the connected account).

### 2. Platform API keys (server only)


| Variable                | Required            | Example                        | Notes                                                         |
| ----------------------- | ------------------- | ------------------------------ | ------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | For real payments   | `sk_test_...` or `sk_live_...` | Platform secret key — never expose in browser or git          |
| `STRIPE_WEBHOOK_SECRET` | With Stripe enabled | `whsec_...`                    | Signing secret from your platform webhook endpoint            |
| `APP_BASE_URL`          | Recommended         | `http://localhost:23032`       | Used for Stripe onboarding return URLs and checkout redirects |


```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
APP_BASE_URL=http://localhost:23032
```

If `STRIPE_SECRET_KEY` is unset, checkout runs in **mock mode** (dev only — redirects without charging). **Mock mode is blocked in production.**

### 3. Register the platform webhook endpoint

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://yourdomain.com/api/checkout/webhook`
3. **Events:**
  - `checkout.session.completed` (required — marks orders paid)
  - `account.updated` (recommended — refreshes business Connect status)
4. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

**Local development with Stripe CLI:**

```bash
stripe listen --forward-to localhost:8080/api/checkout/webhook
```

Use the CLI’s printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` in your local `.env`. This secret is **different** from production dashboard secrets.

### 4. Deploy and verify (platform)

1. Set secrets on your host and restart the API.
2. **Admin → System Status** — Stripe should show **Healthy** with `mode: test` or `live`, `webhookConfigured: true`, and `connectSupport: true`.
3. Production checklist:
  - [ ] Live platform key (`sk_live_...`) in production
     [ ] Live webhook signing secret matches the live endpoint
     [ ] Webhook URL uses HTTPS
     [ ] Mock checkout is **not** used in production

---

## Part B — Business owner setup

Each business that accepts **online card payments** must connect its own Stripe account.

### 1. Open payment settings

1. Sign in as the business owner.
2. Go to **Business Dashboard → Settings**.
3. Find the **Payments** card.

### 2. Connect Stripe

**If not connected:**

- Status: **Not connected**
- Click **Connect Stripe**
- Complete Stripe’s secure onboarding (business details, bank account, identity as required)
- You are returned to TownHub payment settings

**If setup is incomplete:**

- Status: **Setup in progress**
- Click **Continue Stripe setup** to finish requirements

**If connected:**

- Status: **Connected**
- Masked connected account ID, **Test** or **Live** mode, online payments enabled
- **Manage Stripe** opens the Stripe Express dashboard (payouts, account details)

### 3. Enable online payments in ordering options

Under **Ordering Options → Payment options**, choose a mode that includes online payment:


| Mode                | Card online            | Pay at pickup |
| ------------------- | ---------------------- | ------------- |
| Online payment only | Yes (requires Connect) | No            |
| Pay at pickup only  | No                     | Yes           |
| Both                | Yes (requires Connect) | Yes           |


Online card checkout is **disabled** until Connect status is **Connected** and Stripe reports charges enabled.

---

## How payment confirmation works

```text
Customer → order (STRIPE) → Checkout on business connected account
       → payment succeeds
       → platform webhook (signed) checkout.session.completed
       → order paymentStatus = PAID
```

Safety measures:

- **Webhook signature verification** on raw body — forged requests return `400`
- **Connected account match** — session must belong to the business’s connected account
- **Idempotent updates** — duplicate webhooks do not double-apply
- **Session + amount checks** — order total and session binding validated
- **Pay-at-pickup guard** — `IN_PERSON` orders never marked paid via webhook
- **Success page is not payment proof** — only the webhook marks orders `PAID`

---

## Testing in Stripe test mode

### Platform

1. Use `sk_test_...` and matching CLI or test webhook `whsec_...`.
2. Restart the API after changing env vars.

### Connect a test business

1. As business owner → **Settings → Payments** → **Connect Stripe**.
2. Complete test onboarding (Stripe test data).
3. Confirm status shows **Connected** (Test mode).

### End-to-end card checkout

1. Ensure business payment mode allows online payment and Connect is **Connected**.
2. Place an order with **Pay with Card**.
3. Pay with test card `**4242 4242 4242 4242`**, any future expiry, any CVC.
4. Stripe Dashboard → **Webhooks** → confirm `checkout.session.completed` returned **200**.
5. Business Hub → order should show `**PAID`** only after webhook delivery (not from redirect alone).

### Test scenarios


| Scenario                                    | Expected                                      |
| ------------------------------------------- | --------------------------------------------- |
| Business not connected, customer tries card | Order/checkout rejected — online unavailable  |
| Pay at pickup                               | Order created, no Stripe, stays `PENDING`     |
| Duplicate webhook                           | Order stays `PAID`, no duplicate side effects |
| Invalid webhook signature                   | `400`, order unchanged                        |
| Mock mode (no platform key, dev only)       | Fake redirect, order stays `PENDING`          |


---

## Troubleshooting


| Symptom                                            | Likely cause                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Connect Stripe** fails / “Connect is not enabled” | Platform operator has not completed [Stripe Connect setup](https://dashboard.stripe.com/connect) on the TownHub Stripe account (test or live mode must match your keys) |
| Status stuck **Setup in progress**                 | Incomplete onboarding — click **Continue Stripe setup**                         |
| Status **Restricted**                              | Stripe disabled the account — use **Manage Stripe** or Stripe support           |
| Checkout works but order stays `PENDING`           | Webhook missing, wrong URL, or secret mismatch                                  |
| `400 Invalid Stripe signature`                     | Wrong `STRIPE_WEBHOOK_SECRET`, or body not raw                                  |
| Customer sees “Online card payments not available” | Business not connected or not **Connected** status                              |
| System Status Stripe unhealthy (live)              | Live key without webhook secret                                                 |


Check API logs for `[operational] stripe_webhook_failed`. Logs never include secret keys or card data.

---

## Related docs

- [RESEND_SETUP.md](./RESEND_SETUP.md) — email notifications
- [TWILIO_SETUP.md](./TWILIO_SETUP.md) — SMS notifications
- [PRODUCTION.md](../PRODUCTION.md) — full production checklist
- [PRODUCTION_MONITORING.md](./PRODUCTION_MONITORING.md) — health checks and operational logging

