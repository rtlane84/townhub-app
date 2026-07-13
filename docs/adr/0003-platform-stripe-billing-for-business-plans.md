# Platform Stripe Billing for Business Plans

## Status

Accepted

## Context

Business subscriptions pay TownHub, while customer orders pay individual businesses through Connect. Combining those domains would make ownership, reconciliation, feature gating, and webhook behavior unsafe.

## Decision

Create business-plan customers, Checkout subscriptions, portal sessions, and plan changes on the TownHub platform Stripe account. Store their state in `business_subscriptions` and map Stripe prices to `subscription_plans`. Route platform subscription events separately from Connect order/refund events even though both webhook destinations use `/api/checkout/webhook`.

## Consequences

- Platform and connected-account webhook signing secrets remain distinct.
- Subscription events may change entitlements and send lifecycle notifications, but never modify orders.
- Order/refund events never modify business subscriptions.
- Complimentary/beta plans can remain outside Stripe Billing while using the same entitlement model.
