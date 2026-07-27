import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Stripe from "stripe";
import { mapStripeCheckoutSessionError } from "./stripe-checkout-errors";

describe("mapStripeCheckoutSessionError", () => {
  it("maps amount_too_small to a clear 400", () => {
    const err = new Stripe.errors.StripeInvalidRequestError({
      message: "The Checkout Session's total amount due must add up to at least $0.50 USD",
      type: "invalid_request_error",
      code: "amount_too_small",
    });
    (err as { requestId?: string }).requestId = "req_test_123";

    const mapped = mapStripeCheckoutSessionError(err);
    assert.ok(mapped);
    assert.equal(mapped.status, 400);
    assert.equal(mapped.code, "amount_too_small");
    assert.match(mapped.error, /\$0\.50/);
    assert.equal(mapped.stripeRequestId, "req_test_123");
  });

  it("maps other invalid requests to 400 without leaking raw Stripe copy as the only code path", () => {
    const err = new Stripe.errors.StripeInvalidRequestError({
      message: "No such account: acct_x",
      type: "invalid_request_error",
      code: "account_invalid",
    });
    const mapped = mapStripeCheckoutSessionError(err);
    assert.ok(mapped);
    assert.equal(mapped.status, 400);
    assert.equal(mapped.code, "account_invalid");
  });

  it("returns null for non-Stripe errors", () => {
    assert.equal(mapStripeCheckoutSessionError(new Error("boom")), null);
    assert.equal(mapStripeCheckoutSessionError("nope"), null);
  });
});
