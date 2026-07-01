# Subscription Notifications

TownHub sends branded **owner lifecycle emails** for platform subscriptions (businesses paying TownHub). Stripe continues to handle official payment receipts and invoices.

## TownHub vs Stripe emails

| Sent by | Examples |
|---------|----------|
| **TownHub** | Welcome, trial reminders, subscription activated, payment received (account update), payment failed, cancellation scheduled, subscription ended/expired |
| **Stripe** | Payment receipts, invoices, card charge confirmations, Stripe Customer Portal receipts |

TownHub emails focus on onboarding, account status, and next steps. They explicitly tell owners that Stripe sends official billing documents separately.

## Setup

1. Configure email transport — see [RESEND_SETUP.md](./RESEND_SETUP.md) or SMTP vars in `.env.example`.
2. Set `APP_BASE_URL` so Business Hub, subscription, and Help Center links resolve correctly.
3. Set `PLATFORM_ADMIN_EMAIL` (comma-separated) for operational admin alerts, or rely on users with the `ADMIN` role.
4. For trial reminders, set `JOB_SECRET` and schedule the internal job (below).

## Owner email events

| Event | Trigger | Purpose |
|-------|---------|---------|
| `SUBSCRIPTION_WELCOME` | Stripe checkout completed | Single onboarding email after paid checkout (includes trial details when applicable) |
| `APPLICATION_APPROVED` | Admin approves a business application | Approval email for all plans; paid plans include checkout setup CTA |
| `SUBSCRIPTION_TRIAL_STARTED` | Rare non-checkout trial transitions only | Suppressed when Welcome already sent |
| `SUBSCRIPTION_TRIAL_ENDING_7D` | Daily job, 7 calendar days before `trialEndsAt` | Reminder before billing |
| `SUBSCRIPTION_TRIAL_ENDING_1D` | Daily job, 1 calendar day before `trialEndsAt` | Final trial reminder |
| `SUBSCRIPTION_ACTIVATED` | Trial → Active | Paid subscription started after trial |
| `SUBSCRIPTION_PAYMENT_SUCCEEDED` | `invoice.paid` with `billing_reason=subscription_cycle` | Recurring payment account update (not a receipt) |
| `SUBSCRIPTION_PAYMENT_FAILED` | `invoice.payment_failed` or status → `PAST_DUE` | Prompt to update payment method |
| `SUBSCRIPTION_CANCEL_SCHEDULED` | `cancel_at_period_end` becomes true | Access continues until cancellation date |
| `SUBSCRIPTION_CANCELED` | Subscription fully ended | Paid features disabled; reactivate CTA |
| `SUBSCRIPTION_EXPIRED` | Canceled/suspended after `PAST_DUE` | Failed payment expiration |

### Onboarding deduplication

- **Admin approval** sends one `APPLICATION_APPROVED` email (paid plans prompt checkout; complimentary/trial plans include Business Hub onboarding).
- **Stripe checkout** sends one `SUBSCRIPTION_WELCOME` email after payment setup completes.
- TownHub does **not** send a separate Trial Started email immediately after checkout or approval when onboarding email already covers trial status.

## Platform admin email events

Simple operational emails sent to `PLATFORM_ADMIN_EMAIL` and/or all `ADMIN` users:

| Event | Trigger |
|-------|---------|
| `ADMIN_TRIAL_STARTED` | Owner Welcome email for a trial subscription |
| `ADMIN_SUBSCRIPTION_PAID_STARTED` | Owner Welcome for active (non-trial) subscription, or trial → active conversion |
| `ADMIN_PAYMENT_FAILED` | Owner payment failed email |
| `ADMIN_SUBSCRIPTION_CANCELED` | Owner subscription ended email |
| `ADMIN_SUBSCRIPTION_EXPIRED` | Owner subscription expired email |

## Help Center placeholders

Welcome and lifecycle emails link to Help Center anchors (future content):

- `/help#welcome-video`
- `/help#business-owner-training`
- `/help#customer-training`

## Webhook integration

Subscription emails are emitted after `business_subscriptions` is updated from Stripe webhooks:

- `checkout.session.completed` (subscription mode)
- `customer.subscription.created` / `.updated` / `.deleted`
- `invoice.paid` / `invoice.payment_failed`

See [STRIPE_BILLING_SETUP.md](./STRIPE_BILLING_SETUP.md) for webhook configuration.

## Scheduled jobs

TownHub does not run an in-process scheduler. Background jobs are documented here and invoked via secured HTTP endpoints.

### Trial reminder job

**Endpoint:** `POST /api/internal/jobs/subscription-trial-reminders`

**Recommended schedule:** once daily at approximately **8:00 AM server time** (adjust for your hosting timezone).

```bash
# Example crontab (8:00 AM UTC daily)
0 8 * * * curl -sS -X POST -H "Authorization: Bearer $JOB_SECRET" https://your-api-host/api/internal/jobs/subscription-trial-reminders
```

Response:

```json
{ "scanned": 12, "sent7Day": 1, "sent1Day": 0, "skipped": 11 }
```

Reminders are deduplicated via `notification_logs` (`SUBSCRIPTION_TRIAL_ENDING_7D` / `SUBSCRIPTION_TRIAL_ENDING_1D`).

### Job authentication

All internal jobs require `JOB_SECRET` via:

- `Authorization: Bearer <JOB_SECRET>`, or
- `X-Job-Secret: <JOB_SECRET>`

See `.env.example` for configuration.

## Owner email resolution

1. `business.notificationEmail`
2. `business.orderNotificationEmail`
3. Owner `users.email` (skips `@user.local` placeholders)

## Code locations

| File | Role |
|------|------|
| `artifacts/api-server/src/lib/email-templates/subscription-emails.ts` | Owner HTML/text templates |
| `artifacts/api-server/src/lib/email-templates/subscription-admin-emails.ts` | Admin operational templates |
| `artifacts/api-server/src/lib/subscription-notification-core.ts` | Transition detection |
| `artifacts/api-server/src/lib/subscription-notifications.ts` | Send orchestration + trial job |
| `artifacts/api-server/src/routes/internal-jobs.ts` | Secured job endpoints |

## Testing

```bash
pnpm --filter @workspace/api-server run test
pnpm -w run typecheck
```

Tests cover event detection, deduplication rules, and template output (`subscription-notifications.test.ts`).
