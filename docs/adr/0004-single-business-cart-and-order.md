# Single-Business Cart and Order

## Status

Accepted

## Context

Products, ownership, fulfillment settings, taxes, payment modes, connected accounts, notifications, and owner operations are business-scoped. A multi-business checkout would require order splitting and payment/fulfillment coordination not present in the beta architecture.

## Decision

A cart and resulting order contain products from exactly one business. The localStorage cart records one `businessId`; adding from another business requires confirmation before clearing the existing cart. The API reloads products for the submitted business and validates all item IDs against it.

## Consequences

- Totals, tax, fulfillment, payment, notifications, and ownership remain unambiguous.
- Customers place separate orders for separate businesses.
- Cross-business cart support requires a new product and payment design, not removal of the current guard.
