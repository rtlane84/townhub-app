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

| Payment method | Trigger |
|----------------|---------|
| Pay at pickup (`IN_PERSON`) | Immediately after `POST /api/orders` |
| Card (`STRIPE`) | After Stripe webhook marks the order `PAID` |

Card orders do **not** send this email on order create — only after payment is confirmed by the webhook. That avoids telling customers their order was received before they finish paying.

**Email**

- **Subject:** `We received your order`
- **Tone:** Thank you; the business has received the order and is reviewing it; another update will come when they accept it.
- **Includes:** Business name, order number, date/time, fulfillment method, items, total, **View Order** button.
- **Never uses** the word “confirmed” in this first message.

**SMS example**

```text
Clay Diner received your order #LOH-20260629-ABC12. We'll notify you when it's accepted. https://yourdomain.com/order/42
```

---

### 2. Business accepts the order

**Trigger:** Business sets status to `CONFIRMED`

| Channel | Content |
|---------|---------|
| Email subject | `{Business Name} accepted your order` |
| Email body | Business accepted the order; preparation will begin soon |
| SMS | `{Business} accepted your order #{number}.` + order link |

---

### 3. Order is being prepared

**Trigger:** Status → `PREPARING`

| Channel | Content |
|---------|---------|
| Email subject | `Your order is being prepared` |
| Email body | Kitchen/shop is actively preparing the order |
| SMS | `Your order #{number} from {Business} is being prepared.` + link |

---

### 4. Ready for pickup

**Trigger:** Status → `READY_FOR_PICKUP`

| Channel | Content |
|---------|---------|
| Email subject | `Your order is ready for pickup` |
| Email body | Excited tone; includes pickup location (business address + pickup instructions when set) |
| SMS | `Your order #{number} is ready for pickup at {Business}.` + link |

---

### 5. Out for delivery

**Trigger:** Status → `OUT_FOR_DELIVERY`

| Channel | Content |
|---------|---------|
| Email subject | `Your order is on the way` |
| Email body | Order has left for delivery; **Track Order** button links to order page |
| SMS | `Your order #{number} from {Business} is on the way.` + link |

---

### 6. Completed (optional thank-you)

**Trigger:** Status → `COMPLETED`

Short thank-you email encouraging the customer to order again. SMS sends a brief thanks with order link.

---

### 7. Cancelled

**Trigger:** Status → `CANCELED`

| Channel | Content |
|---------|---------|
| Email subject | `Your order was cancelled` |
| Email body | Business cancelled the order |
| Refund note | If payment method was `STRIPE` and `paymentStatus` is `PAID`, email explains a refund will be processed (5–10 business days) |
| SMS | `Unfortunately your order #{number} from {Business} was cancelled.` + link |

---

### Statuses that do **not** notify customers

| Status | Why |
|--------|-----|
| `NEW` | Internal queue state; customer already got **Order received** |
| Unchanged status on PATCH | No duplicate notifications |

---

## Business (owner) notifications

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
Clay Diner: New order #LOH-20260629-ABC12
Alex · $24.50 · Paid
https://yourdomain.com/dashboard/business/orders/42
```

**Owner delivery settings** (Business Dashboard → Settings → Owner Notifications):

| Setting | Default | Effect |
|---------|---------|--------|
| `notificationEmail` | — | Primary owner email |
| `notificationPhone` | — | Owner SMS number (E.164) |
| `notifyNewOrdersByEmail` | `true` | Email on new order |
| `notifyNewOrdersBySms` | `false` | SMS on new order |

Email sends when the toggle is not `false` and an email is set. SMS sends only when the toggle is `true` and a phone is set.

### Appointment requests

Separate plain-text owner alerts for new appointment requests. See [RESEND_SETUP.md](./RESEND_SETUP.md) and [TWILIO_SETUP.md](./TWILIO_SETUP.md).

---

## Payment vs. notification timing

Payment status and notification content are intentionally separate:

| Concern | Controlled by |
|---------|---------------|
| `paymentStatus = PAID` | Stripe webhook only (`checkout.session.completed`) |
| “Order received” customer email/SMS (card) | Same webhook, after `PAID` |
| Success page copy | Frontend — “Payment received. Waiting for restaurant acceptance.” while `PENDING`; no false “paid” claim before webhook |

Pay-at-pickup orders skip Stripe entirely; customer notifications start on order create.

---

## Links and environments

All notification URLs are built from `APP_BASE_URL` — never hardcoded in templates.

| Audience | URL pattern |
|----------|-------------|
| Customer order page | `{APP_BASE_URL}/order/{orderId}` |
| Business order detail | `{APP_BASE_URL}/dashboard/business/orders/{orderId}` |

Set `APP_BASE_URL` per environment:

```bash
# Local
APP_BASE_URL=http://localhost:5173

# Staging
APP_BASE_URL=https://staging.yourtown.com

# Production
APP_BASE_URL=https://yourtown.com
```

If unset, the API falls back to `REPLIT_DOMAINS` or `http://localhost:5173`. **Always set `APP_BASE_URL` in staging and production** so emails and SMS contain correct links.

---

## Email design

Customer and business order emails use shared HTML components:

| Component | Purpose |
|-----------|---------|
| TownHub header bar | Platform branding |
| Business logo | Shown when `business.logoUrl` is set |
| Status badge | Visual lifecycle state |
| Detail table | Order metadata rows |
| Order items block | Line items + total |
| Action button | View Order / Open Order / Track Order |
| Footer | “Powered by TownHub” |

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

| File | Role |
|------|------|
| `notification-service.ts` | `notifyCustomerOrderReceived`, `notifyCustomerOrderStatusChange`, `notifyOwnerNewOrderFromOrderId` |
| `email-templates/customer-emails.ts` | Customer lifecycle email content |
| `email-templates/business-emails.ts` | Owner new-order HTML email |
| `email-templates/layout.ts` | Shared HTML shell, spacing, footer |
| `email-templates/components.ts` | Buttons, badges, item tables, labels |
| `notification-sms.ts` | SMS copy for all lifecycle events |
| `notification-delivery.ts` | Send + write `notification_logs` |
| `notifications.ts` | Public exports + appointment owner alerts |

### Lifecycle event mapping

| Order status | Customer event | Logged `eventType` |
|--------------|----------------|--------------------|
| *(checkout / webhook)* | `ORDER_RECEIVED` | `ORDER_RECEIVED` |
| `CONFIRMED` | `ORDER_ACCEPTED` | `ORDER_ACCEPTED` |
| `PREPARING` | `ORDER_PREPARING` | `ORDER_PREPARING` |
| `READY_FOR_PICKUP` | `ORDER_READY_FOR_PICKUP` | `ORDER_READY_FOR_PICKUP` |
| `OUT_FOR_DELIVERY` | `ORDER_OUT_FOR_DELIVERY` | `ORDER_OUT_FOR_DELIVERY` |
| `COMPLETED` | `ORDER_COMPLETED` | `ORDER_COMPLETED` |
| `CANCELED` | `ORDER_CANCELLED` | `ORDER_CANCELLED` |

---

## Provider setup

| Channel | Provider | Setup doc |
|---------|----------|-----------|
| Email | Resend (preferred) or SMTP | [RESEND_SETUP.md](./RESEND_SETUP.md) |
| SMS | Twilio | [TWILIO_SETUP.md](./TWILIO_SETUP.md) |

When providers are not configured, notifications are still logged with status `LOGGED` so you can verify copy in **Admin → notification logs** without sending real messages.

---

## Testing checklist

Verify each scenario in test mode with `APP_BASE_URL` set to your local or staging URL:

- [ ] Pay at pickup — customer gets **We received your order** immediately
- [ ] Stripe card — customer gets **We received your order** only after webhook marks `PAID`
- [ ] Guest checkout — order link works without sign-in (`/order/{id}`)
- [ ] Signed-in customer — same order link; **My Orders** available separately
- [ ] Pickup — ready-for-pickup email includes address/instructions
- [ ] Delivery — out-for-delivery email sends
- [ ] Cancelled card order that was paid — refund note appears
- [ ] Business new-order email — HTML layout, **Open Order** uses dashboard URL
- [ ] Business SMS — includes dashboard link
- [ ] Status `CONFIRMED` — says “accepted”, not “confirmed” in the first email (first email already sent earlier)
- [ ] No duplicate messages when status PATCH sends the same value

Run notification unit tests:

```bash
pnpm --filter @workspace/api-server run test
```

---

## Related docs

- [RESEND_SETUP.md](./RESEND_SETUP.md) — email provider configuration
- [TWILIO_SETUP.md](./TWILIO_SETUP.md) — SMS provider configuration
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) — payment webhook (triggers card **Order received** notification)
- [PRODUCTION_MONITORING.md](./PRODUCTION_MONITORING.md) — health checks and notification logs
