# Stripe Connect Direct Charges for Customer Orders

## Status

Accepted

## Context

Each ordering business owns a Stripe Express connected account. TownHub must keep customer funds and refund operations associated with that business rather than charging all orders on the platform account.

## Decision

Create card Checkout Sessions as direct charges by passing the business `stripeConnectedAccountId` as Stripe request context. Persist a `pending_checkouts` record first and materialize one `PAID` order only after verified `checkout.session.completed` payment. Pay-at-pickup bypasses Stripe and creates an order immediately.

## Consequences

- A business must finish Connect onboarding and have charges enabled before accepting cards.
- Checkout, retrieval, refund, and connected-account webhooks must retain the same account context.
- Amount, session, pending-checkout, and connected-account bindings are security boundaries.
- Webhook/confirmation retries must converge on one order; browser redirects are not proof of payment.
