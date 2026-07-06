# Order Notifications

TownHub sends email and SMS notifications when meaningful **business events** happen during the order lifecycle — not when raw database status labels change internally.

Each notification answers:

- **What happened?**
- **What should the customer do** (if anything)?
- **What happens next?**

Notifications are fire-and-forget: they never block API responses. Delivery attempts are logged to `notification_logs` (viewable in **Admin → System Status**).

---

## Overview

```text
Customer checkout
       │
       ├─ Pay at pickup ──► ORDER_RECEIVED (email + SMS)
       │
       └─ Card (Stripe) ──► payment webhook marks PAID ──► ORDER_RECEIVED (email + SMS)

Business owner ──► NEW_ORDER (email + SMS, per business settings)

Business updates status ──► lifecycle email + SMS for that event
       CONFIRMED → ORDER_ACCEPTED
       PREPARING → ORDER_PREPARING
       READY_FOR_PICKUP → ORDER_READY_FOR_PICKUP
       OUT_FOR_DELIVERY → ORDER_OUT_FOR_DELIVERY
       COMPLETED → ORDER_COMPLETED
       CANCELED → ORDER_CANCELLED
```

---

## Customer notification flow

### 1. Order received (first message)

**When it sends**


| Payment method              | Trigger                                     |
| --------------------------- | ------------------------------------------- |
| Pay at pickup (`IN_PERSON`) | Immediately after `POST /api/orders`        |
| Card (`STRIPE`)             | After Stripe webhook marks the order `PAID` |


Card orders do **not** send this email on order create — only after payment is confirmed by the webhook. That avoids telling customers their order was received before they finish paying.

**Email**

- **Subject:** `We received your order`
- **Tone:** Thank you; the business has received the order and is reviewing it; another update will come when they accept it.
- **Includes:** Business name, order number, date/time, fulfillment method, items, total, **View Order** button.
- **Never uses** the word “confirmed” in this first message.

**SMS example**

```text
Clay Diner received your order #TH-20260629-ABC12. We'll notify you when it's accepted. https://yourdomain.com/order/42?token=<accessToken>
```

---

### 2. Business accepts the order

**Trigger:** Business sets status to `CONFIRMED`


| Channel       | Content                                                  |
| ------------- | -------------------------------------------------------- |
| Email subject | `{Business Name} accepted your order`                    |
| Email body    | Business accepted the order; preparation will begin soon |
| SMS           | `{Business} accepted your order #{number}.` + order link |


---

### 3. Order is being prepared

**Trigger:** Status → `PREPARING`


| Channel       | Content                                                          |
| ------------- | ---------------------------------------------------------------- |
| Email subject | `Your order is being prepared`                                   |
| Email body    | Kitchen/shop is actively preparing the order                     |
| SMS           | `Your order #{number} from {Business} is being prepared.` + link |


---

### 4. Ready for pickup

**Trigger:** Status → `READY_FOR_PICKUP`


| Channel       | Content                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| Email subject | `Your order is ready for pickup`                                                         |
| Email body    | Excited tone; includes pickup location (business address + pickup instructions when set) |
| SMS           | `Your order #{number} is ready for pickup at {Business}.` + link                         |


---

### 5. Out for delivery

**Trigger:** Status → `OUT_FOR_DELIVERY`


| Channel       | Content                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| Email subject | `Your order is on the way`                                              |
| Email body    | Order has left for delivery; **Track Order** button links to order page |
| SMS           | `Your order #{number} from {Business} is on the way.` + link            |


---

### 6. Completed (optional thank-you)

**Trigger:** Status → `COMPLETED`

Short thank-you email encouraging the customer to order again. SMS sends a brief thanks with order link.

---

### 7. Cancelled

**Trigger:** Status → `CANCELED`


| Channel       | Content                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Email subject | `Your order was cancelled`                                                                                                   |
| Email body    | Business cancelled the order                                                                                                 |
| Refund note   | If payment method was `STRIPE` and `paymentStatus` is `PAID`, email explains a refund will be processed (5–10 business days) |
| SMS           | `Unfortunately your order #{number} from {Business} was cancelled.` + link                                                   |


---

### Statuses that do **not** notify customers


| Status                    | Why                                                           |
| ------------------------- | ------------------------------------------------------------- |
| `NEW`                     | Internal queue state; customer already got **Order received** |
| Unchanged status on PATCH | No duplicate notifications                                    |


---

## Business (owner) notifications

### In-browser live alerts (Business Hub open)

While **Business Hub** is open in a browser tab, owners also get **live list updates**, **toasts**, and (on non-queue pages) **persistent banners** for new orders and appointment requests. That flow is separate from email/SMS and only runs when the dashboard is loaded.

See **[BUSINESS_HUB_LIVE_NOTIFICATIONS.md](./BUSINESS_HUB_LIVE_NOTIFICATIONS.md)** for:

- Which pages use SSE vs polling  
- Toast vs banner rules by screen  
- Tab/window/background behavior  
- What requires the dashboard to be open vs what works when it is closed  

Server-delivered owner alerts below (email, SMS, ntfy, Discord) are unchanged and do not require an open dashboard tab.

### New order

**Trigger:** Immediately after `POST /api/orders` (all payment methods)

**Email:** Branded HTML layout with:

- Heading: **New Order Received**
- Business logo (when configured)
- Order number, customer name, phone, email
- Payment method and payment status
- Fulfillment type, items, total
- **Open Order** button → business dashboard order detail

**SMS example**

```text
Clay Diner: New order #TH-20260629-ABC12
Alex · $24.50 · Paid
https://yourdomain.com/dashboard/business/orders/42
```

**Owner delivery settings** (Business Dashboard → Settings → Owner Notifications):


| Setting                  | Default | Effect                   |
| ------------------------ | ------- | ------------------------ |
| `notificationEmail`      | —       | Primary owner email      |
| `notificationPhone`      | —       | Owner SMS number (E.164) |
| `notifyNewOrdersByEmail` | `true`  | Email on new order       |
| `notifyNewOrdersBySms`   | `false` | SMS on new order         |


Email sends when the toggle is not `false` and an email is set. SMS sends only when the toggle is `true` and a phone is set.

### Appointment requests

Separate plain-text owner alerts for new appointment requests. See [RESEND_SETUP.md](./RESEND_SETUP.md) and [TWILIO_SETUP.md](./TWILIO_SETUP.md).

---

## Payment vs. notification timing

Payment status and notification content are intentionally separate:


| Concern                                    | Controlled by                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `paymentStatus = PAID`                     | Stripe webhook only (`checkout.session.completed`)                                                                      |
| “Order received” customer email/SMS (card) | Same webhook, after `PAID`                                                                                              |
| Success page copy                          | Frontend — “Payment received. Waiting for restaurant acceptance.” while `PENDING`; no false “paid” claim before webhook |


Pay-at-pickup orders skip Stripe entirely; customer notifications start on order create.

---

## Links and environments

All notification URLs are built from `APP_BASE_URL` — never hardcoded in templates.


| Audience                        | URL pattern                                          |
| ------------------------------- | ---------------------------------------------------- |
| Customer order page (signed-in) | `{APP_BASE_URL}/order/{orderId}`                     |
| Customer order page (guest)     | `{APP_BASE_URL}/order/{orderId}?token={accessToken}` |
| Business order detail           | `{APP_BASE_URL}/dashboard/business/orders/{orderId}` |


Set `APP_BASE_URL` per environment:

```bash
# Local
APP_BASE_URL=http://localhost:23032

# Staging
APP_BASE_URL=https://staging.yourtown.com

# Production
APP_BASE_URL=https://yourtown.com
```

If unset, the API falls back to `REPLIT_DOMAINS` or `http://localhost:5173` (code default). **Set `APP_BASE_URL=http://localhost:23032` for local dev** so emails, SMS, and Stripe redirects use the correct host.

### Guest access tokens in notification links

Guest orders require a signed HMAC access token to view order details (see [SECURITY.md](../SECURITY.md)). The checkout confirmation page, Stripe success URL, and **customer order email/SMS links** include `?token=…` via `customerOrderUrlForNotification()`.

Signed-in customers who placed the order receive links **without** a token because `/order/{id}` matches their `customerUserId` when logged in. They can also use `/my-orders`.

---

## Email design

Customer and business order emails use shared HTML components:


| Component          | Purpose                               |
| ------------------ | ------------------------------------- |
| TownHub header bar | Platform branding                     |
| Business logo      | Shown when `business.logoUrl` is set  |
| Status badge       | Visual lifecycle state                |
| Detail table       | Order metadata rows                   |
| Order items block  | Line items + total                    |
| Action button      | View Order / Open Order / Track Order |
| Footer             | “Powered by TownHub”                  |


Plain-text fallbacks are included for every HTML email. Resend receives both `text` and `html` bodies.

---

## SMS design principles

- **Short** — not a copy of the email
- **One idea per message** — what happened + link
- **Order link on every customer SMS** when phone is provided at checkout
- **Dashboard link on every business SMS** when owner SMS is enabled

Customer SMS requires `customerPhone` on the order. There is no separate customer SMS opt-in toggle today; if a phone number is collected at checkout, lifecycle SMS is sent alongside email.

---

## Architecture (code)

```text
routes/orders.ts, stripe-webhook.ts
       │
       ▼
notification-service.ts     ← orchestration (load order, pick event, send)
       │
       ├── email-templates/   ← HTML + subject + text builders
       ├── notification-sms.ts
       ├── notification-delivery.ts  ← Resend / Twilio + DB logging
       └── notification-urls.ts      ← APP_BASE_URL link helpers
```


| File                                 | Role                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `notification-service.ts`            | `notifyCustomerOrderReceived`, `notifyCustomerOrderStatusChange`, `notifyOwnerNewOrderFromOrderId` |
| `email-templates/customer-emails.ts` | Customer lifecycle email content                                                                   |
| `email-templates/business-emails.ts` | Owner new-order HTML email                                                                         |
| `email-templates/layout.ts`          | Shared HTML shell, spacing, footer                                                                 |
| `email-templates/components.ts`      | Buttons, badges, item tables, labels                                                               |
| `notification-sms.ts`                | SMS copy for all lifecycle events                                                                  |
| `notification-delivery.ts`           | Send + write `notification_logs`                                                                   |
| `notifications.ts`                   | Public exports + appointment owner alerts                                                          |


### Lifecycle event mapping


| Order status           | Customer event           | Logged `eventType`       |
| ---------------------- | ------------------------ | ------------------------ |
| *(checkout / webhook)* | `ORDER_RECEIVED`         | `ORDER_RECEIVED`         |
| `CONFIRMED`            | `ORDER_ACCEPTED`         | `ORDER_ACCEPTED`         |
| `PREPARING`            | `ORDER_PREPARING`        | `ORDER_PREPARING`        |
| `READY_FOR_PICKUP`     | `ORDER_READY_FOR_PICKUP` | `ORDER_READY_FOR_PICKUP` |
| `OUT_FOR_DELIVERY`     | `ORDER_OUT_FOR_DELIVERY` | `ORDER_OUT_FOR_DELIVERY` |
| `COMPLETED`            | `ORDER_COMPLETED`        | `ORDER_COMPLETED`        |
| `CANCELED`             | `ORDER_CANCELLED`        | `ORDER_CANCELLED`        |


---

## Provider setup


| Channel | Provider                   | Setup doc                            |
| ------- | -------------------------- | ------------------------------------ |
| Email   | Resend (preferred) or SMTP | [RESEND_SETUP.md](./RESEND_SETUP.md) |
| SMS     | Twilio                     | [TWILIO_SETUP.md](./TWILIO_SETUP.md) |
| Phone push (free) | ntfy (public `ntfy.sh` by default) | See [Free phone notifications](#free-phone-notifications) below |
| Discord | Webhook URL (owner-configured) | Business Hub → Notifications |


When providers are not configured, notifications are still logged with status `LOGGED` so you can verify copy in **Admin → System Status** without sending real messages.

---

## Free phone notifications

Business owners can receive **free instant phone alerts** via [ntfy](https://ntfy.sh) — no SMS charges from TownHub.

### Requirements

- The free **ntfy** mobile app (iOS or Android) on the owner’s phone
- Phone notifications enabled in **Business Hub → Notifications**

### Setup (owner)

1. Enable **Free phone notifications** in TownHub (generates a private topic).
2. Install the ntfy app from [ntfy.sh/app](https://ntfy.sh/app).
3. In ntfy, tap **Subscribe to topic**, paste your topic (use **Copy topic** in TownHub), and keep the server as **ntfy.sh**.
4. Tap **Send test notification** in TownHub to confirm delivery.

### What gets sent

| Event | Push title |
| ----- | ---------- |
| New order | 🍔 New Order |
| New appointment request | 📅 New Appointment Request |

Messages include business name, key order/appointment details, and a link to the Business Hub dashboard.

### Server configuration

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `NTFY_SERVER_URL` | `https://ntfy.sh` | Base URL for publishing and subscription links |

TownHub stores only the **topic** per business (never the full server URL in the database). Subscription URLs are built at runtime from `NTFY_SERVER_URL` + topic.

**Future:** To use a self-hosted ntfy server, set `NTFY_SERVER_URL` to your instance (for example `https://ntfy.yourdomain.com`). No application code changes are required.

### Security

- Topics are cryptographically random (minimum 32 URL-safe characters).
- Regenerating a topic immediately invalidates the old subscription.
- Topics are omitted from public storefront API responses.
- Do not share your topic — anyone subscribed to it receives your alerts.

---

## Testing checklist

Verify each scenario in test mode with `APP_BASE_URL` set to your local or staging URL:

- [ ] Pay at pickup — customer gets **We received your order** immediately
- [ ] Stripe card — customer gets **We received your order** only after webhook marks `PAID`
- [ ] Guest checkout — confirmation page loads with `?token=` from order response
- [ ] Guest notification links — email/SMS include `?token=` for guest orders
- [ ] Signed-in customer — `/order/{id}` and `/my-orders` work without token
- [ ] Signed-in customer — same order link; **My Orders** available separately
- [ ] Pickup — ready-for-pickup email includes address/instructions
- [ ] Delivery — out-for-delivery email sends
- [ ] Cancelled card order that was paid — refund note appears
- [ ] Business new-order email — HTML layout, **Open Order** uses dashboard URL
- [ ] Business SMS — includes dashboard link
- [ ] ntfy — enable phone notifications, paste topic in ntfy app, test push succeeds
- [ ] ntfy — new order sends push when enabled; disabled sends nothing
- [ ] Status `CONFIRMED` — says “accepted”, not “confirmed” in the first email (first email already sent earlier)
- [ ] No duplicate messages when status PATCH sends the same value

Run notification unit tests:

```bash
pnpm --filter @workspace/api-server run test
```

---

## Related docs

- [BUSINESS_HUB_LIVE_NOTIFICATIONS.md](./BUSINESS_HUB_LIVE_NOTIFICATIONS.md) — in-browser toasts, banners, and SSE while Business Hub is open
- [RESEND_SETUP.md](./RESEND_SETUP.md) — email provider configuration
- [TWILIO_SETUP.md](./TWILIO_SETUP.md) — SMS provider configuration
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) — payment webhook (triggers card **Order received** notification)
- [PRODUCTION_MONITORING.md](./PRODUCTION_MONITORING.md) — health checks and notification logs

