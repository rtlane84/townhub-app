# Stripe Billing Setup (TownHub Platform Subscriptions)

This guide covers **businesses paying TownHub** for subscription plans. It is separate from **Stripe Connect**, which handles customer order payments to each business’s connected account.

| Flow | Who pays whom | Stripe account |
|------|----------------|----------------|
| **Stripe Billing** (this doc) | Business → TownHub platform | Platform Stripe account |
| **Stripe Connect** (`docs/STRIPE_SETUP.md`) | Customer → Business | Business connected account |

---

## Required environment variables

These reuse the platform Stripe keys (same account as Connect platform credentials):

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Platform secret key (`sk_test_` / `sk_live_`) |
| `STRIPE_PLATFORM_WEBHOOK_SECRET` | Signing secret for the **Your account** webhook destination (subscriptions) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Signing secret for the **Connected accounts** destination (orders/refunds) — see [STRIPE_SETUP.md](STRIPE_SETUP.md) |
| `STRIPE_WEBHOOK_SECRET` | Legacy single-secret fallback (optional) |
| `APP_BASE_URL` | Checkout success/cancel URLs and Customer Portal return URL |

Example (`.env`):

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_platform_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_connect_...
APP_BASE_URL=http://localhost:23032
```

If `STRIPE_SECRET_KEY` is unset, the API runs in mock mode (development only).

---

## Stripe Dashboard setup

### 1. Products and prices

For each **paid** subscription plan in TownHub Admin → Subscription Plans:

1. Create a **Product** in the Stripe Dashboard (platform account).
2. Create recurring **Prices** for monthly and/or yearly billing.
3. Copy IDs into the plan:
   - **Stripe Product ID** → `prod_...`
   - **Monthly Price ID** → `price_...`
   - **Yearly Price ID** → `price_...` (optional)

Complimentary / founding / beta plans (`isBeta` or $0 pricing) do **not** need Stripe price IDs.

### 2. Customer Portal

1. Stripe Dashboard → **Settings → Billing → Customer portal**
2. Enable payment method updates, invoice history, and cancellation as needed.
3. No extra env vars — the API creates portal sessions with return URL:
   `{APP_BASE_URL}/dashboard/business/subscription?portal=return`

Returning from the portal triggers a subscription refresh in Business Hub.

### 3. Webhook endpoint

Use the **same** webhook endpoint as order payments:

```
POST https://your-api-host/api/checkout/webhook
```

Subscribe to these events (in addition to existing Connect/order events):

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `account.updated` (Connect — already used)

The handler routes by session `mode` and metadata:

- **Order checkout**: `mode: payment` + `metadata.pendingCheckoutId` → materializes the paid order (Connect); legacy in-flight sessions may still carry `metadata.orderId`
- **Subscription checkout**: `mode: subscription` + `metadata.type: platform_subscription` → updates `business_subscriptions`

Subscription webhooks never modify orders. Order webhooks never modify subscription status.

---

## Database schema

After pulling billing changes, apply schema updates:

```bash
cd lib/db && pnpm run push
```

New/updated fields:

**`subscription_plans`**: `stripe_product_id`, `stripe_monthly_price_id`, `stripe_yearly_price_id`

**`business_subscriptions`**: `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `billing_interval`, `cancel_at_period_end`, status `INCOMPLETE`

**`business_applications`**: `billing_interval` (applicant's monthly/yearly choice)

---

## Monthly vs yearly billing

- Applicants choose **Monthly** or **Yearly** when selecting a paid plan during application.
- Admins can override the billing interval when approving an application or assigning a plan.
- Stripe Checkout uses the matching **Monthly** or **Yearly** price ID from the plan configuration.
- The selected interval is stored on `business_subscriptions.billing_interval` and shown in Business Hub.

---

## Changing plans

Business owners use **Business Hub → Subscription → Change Plan** to:

- Upgrade or downgrade to any public paid plan
- Switch between monthly and yearly billing

Behavior:

- If the business has **no active Stripe subscription** (`INCOMPLETE` / `CANCELED`), Change Plan starts Stripe Checkout.
- If a Stripe subscription exists, TownHub calls `stripe.subscriptions.update` with **proration** (`create_prorations`) — no duplicate subscriptions.
- Webhooks (`customer.subscription.updated`) sync the new plan, price, and interval.

Admins can still manually assign plans via **Admin → Businesses**.

---

## Cancellation behavior

| Stripe state | TownHub status | Feature access |
|--------------|----------------|----------------|
| `cancel_at_period_end=true`, status `active`/`trialing` | `ACTIVE` / `TRIAL` | Enabled until period end |
| Status `canceled` or `customer.subscription.deleted` | `CANCELED` | Paid features locked |

Business Hub shows:

- **Cancellation scheduled** with the end date when `cancelAtPeriodEnd` is true
- **Subscription canceled** when fully canceled

After returning from the Customer Portal, the subscription page auto-refreshes.

---

## Business lifecycle

1. **Apply** — applicant selects a plan and billing interval (no card required).
2. **Admin approves** —
   - Complimentary/beta/free → `BETA` / `TRIAL` / `ACTIVE`
   - Paid plan → `INCOMPLETE` (features locked until checkout)
3. **Owner** opens Business Hub → Subscription → **Start Free Trial** / **Start Subscription**
4. Stripe Checkout (`mode: subscription`) on the **platform** account
5. Webhooks sync status, trial end, billing period, and Stripe IDs
6. **Manage Billing** opens Stripe Customer Portal (payment method, invoices, cancel)
7. **Change Plan** upgrades/downgrades or switches monthly/yearly via Stripe

---

## Webhook synchronization

| Event | TownHub action |
|-------|----------------|
| `checkout.session.completed` (subscription mode) | Attach Stripe subscription, sync plan/interval/status |
| `customer.subscription.updated` | Sync status, periods, `cancelAtPeriodEnd`, plan from price ID |
| `customer.subscription.deleted` | Set status `CANCELED`, clear scheduled cancel |
| `invoice.paid` | Full subscription resync |
| `invoice.payment_failed` | Full subscription resync (typically `PAST_DUE`) |

Webhook sync also triggers TownHub subscription lifecycle emails (welcome, payment failed, etc.). See [SUBSCRIPTION_NOTIFICATIONS.md](./SUBSCRIPTION_NOTIFICATIONS.md).

Order payment webhooks (`checkout.session.completed` with `metadata.pendingCheckoutId`, or legacy `metadata.orderId`) are never mixed with subscription events.

---

## Test mode walkthrough

### Subscription checkout

1. Set `sk_test_...` and run Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:8080/api/checkout/webhook
   ```
2. In Admin, configure a paid plan with test price IDs.
3. Approve a business on that plan (status should be `INCOMPLETE`).
4. As the business owner, go to **Business Hub → Subscription** and start checkout.
5. Use test card `4242 4242 4242 4242`.
6. Confirm webhook delivery and status → `TRIAL` or `ACTIVE`.

### Failed payment

1. Use Stripe test clock or a card that fails on renewal (`4000 0000 0000 0341`).
2. Trigger `invoice.payment_failed`.
3. Confirm business status → `PAST_DUE` and warning in Business Hub.

### Cancellation

1. Open **Manage Billing** → cancel at period end in Customer Portal.
2. Confirm `customer.subscription.updated` sets `cancelAtPeriodEnd=true` while status stays `ACTIVE`/`TRIAL`.
3. After the period ends (or immediate cancel), confirm status → `CANCELED` via `customer.subscription.deleted`.
4. Return to Business Hub — the page refreshes automatically from `?portal=return`.

### Change plan

1. With an active subscription, open **Change Plan** in Business Hub.
2. Select a different plan or switch monthly ↔ yearly.
3. Confirm Stripe proration invoice and webhook sync.

### Verify Connect orders still work

1. Complete a customer storefront checkout (Connect `mode: payment`).
2. Confirm order → `PAID` and subscription row unchanged.

---

## API endpoints

| Method | Path | Access |
|--------|------|--------|
| `POST` | `/api/businesses/:id/subscription/checkout` | Business owner or admin |
| `POST` | `/api/businesses/:id/subscription/portal` | Business owner or admin (requires `stripeCustomerId`) |
| `POST` | `/api/businesses/:id/subscription/change-plan` | Business owner or admin |
| `GET` | `/api/businesses/:id/subscription` | Business owner or admin |

Checkout / change-plan body:

```json
{ "planId": 2, "interval": "monthly" }
```

---

## Feature gating

Paid features are enabled when subscription status is:

- `BETA`, `TRIAL`, `ACTIVE`, `PAST_DUE` (with UI warning for past due)

Locked for paid plans when:

- `INCOMPLETE`, `CANCELED`, `SUSPENDED`

Complimentary/founding plans keep access except when `SUSPENDED`.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Checkout returns 400 “missing Stripe price ID” | Plan has `stripeMonthlyPriceId` / `stripeYearlyPriceId` in admin |
| Status stuck on `INCOMPLETE` | Webhook secret, endpoint URL, and event subscriptions |
| Order materialized incorrectly | Current order sessions must have `metadata.pendingCheckoutId`; subscription sessions must have `metadata.type: platform_subscription` instead |
| Portal changes not reflected | Return URL includes `?portal=return`; use Refresh or refocus the tab |

For Connect order payments, see `docs/STRIPE_SETUP.md`.
