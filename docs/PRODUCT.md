# Product

TownHub is a Clay-first local marketplace SaaS. Residents discover local businesses, order for pickup or delivery, request appointments, follow mobile businesses, and view community events. Business owners manage their storefronts and operations; platform admins manage the marketplace.

## Current roles

- Guest/customer: browse, order, request appointments, and view protected orders.
- Business owner: manage authorized businesses, catalog, fulfillment, notifications, payments, and subscriptions.
- Admin: manage businesses, applications, users, plans, events, highlights, and platform health.

## Product rules

- One cart and order contain products from one business only.
- Card payments are direct Stripe Connect charges; business subscriptions use separate Stripe Billing flows.
- A card order exists only after verified payment. Pay-at-pickup orders are immediately pending.
- Appointment requests are requests, not calendar reservations.
- Feature access is enforced by the API and subscription plan.
- Clay is the pilot locality. The product is not yet locality-isolated for multi-town operation.

## Current limits

Browser-local carts, unpaginated lists, single-instance live updates, and no multi-locality architecture are intentional beta limits. Expand these only through an explicit product and technical decision.

Accepted long-lived decisions are in [adr/](adr/). Historical requirements and launch evidence live in [history/](history/).
