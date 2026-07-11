import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { mapStripeConnectStartError } from "./stripe-connect-errors";

describe("mapStripeConnectStartError", () => {
  it("maps Connect-not-enabled to 503 with clear message", () => {
    const err = new Stripe.errors.StripeInvalidRequestError({
      message:
        "You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect.",
      type: "invalid_request_error",
    });

    const mapped = mapStripeConnectStartError(err);
    assert.equal(mapped.status, 503);
    assert.equal(mapped.code, "stripe_connect_not_enabled");
    assert.match(mapped.error, /Connect is not enabled/);
  });
});
