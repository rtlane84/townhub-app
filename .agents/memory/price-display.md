---
name: Price display gotcha
description: API returns prices as dollar floats, not cents — never divide by 100 in frontend
---

## Rule
The API serializes `numeric(10,2)` DB columns via `parseFloat()` and returns them as dollar values (e.g., `42.00` for $42). Display them with `.toFixed(2)` directly — do NOT divide by 100.

**Why:** The design subagent assumed Stripe-style cents format, adding `/ 100` in all price displays. This caused $42 to render as $0.42.

**How to apply:** Any time a product price, order total, delivery fee, or item subtotal is displayed, use `value.toFixed(2)` not `(value / 100).toFixed(2)`.
