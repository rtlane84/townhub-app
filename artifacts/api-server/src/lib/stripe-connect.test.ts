import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveConnectPaymentStatus,
  maskStripeAccountId,
  connectStatusFromAccount,
} from "./stripe-connect-status";
import {
  parseCheckoutSessionConnectedAccountId,
  isMockCheckoutAllowed,
} from "./stripe-config";

describe("stripe-connect-status", () => {
  it("maskStripeAccountId hides the middle of account ids", () => {
    assert.equal(maskStripeAccountId("acct_1234567890abcdef"), "acct_123…cdef");
  });

  it("deriveConnectPaymentStatus returns not_connected without account id", () => {
    assert.equal(deriveConnectPaymentStatus(null, null), "not_connected");
  });

  it("deriveConnectPaymentStatus returns connected when charges enabled and details submitted", () => {
    assert.equal(
      deriveConnectPaymentStatus(
        {
          id: "acct_123",
          charges_enabled: true,
          payouts_enabled: true,
          details_submitted: true,
        } as never,
        "acct_123",
      ),
      "connected",
    );
  });

  it("deriveConnectPaymentStatus returns pending when onboarding incomplete", () => {
    assert.equal(
      deriveConnectPaymentStatus(
        {
          id: "acct_123",
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
        } as never,
        "acct_123",
      ),
      "pending",
    );
  });

  it("deriveConnectPaymentStatus returns restricted when disabled", () => {
    assert.equal(
      deriveConnectPaymentStatus(
        {
          id: "acct_123",
          charges_enabled: false,
          details_submitted: true,
          requirements: { disabled_reason: "requirements.past_due" },
        } as never,
        "acct_123",
      ),
      "restricted",
    );
  });

  it("deriveConnectPaymentStatus returns restricted when payouts are disabled", () => {
    assert.equal(
      deriveConnectPaymentStatus(
        {
          id: "acct_123",
          charges_enabled: true,
          payouts_enabled: false,
          details_submitted: true,
        } as never,
        "acct_123",
      ),
      "restricted",
    );
  });

  it("connectStatusFromAccount never exposes full account ids", () => {
    const status = connectStatusFromAccount(
      {
        id: "acct_1234567890abcdef",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        requirements: { currently_due: [] },
      } as never,
      "acct_1234567890abcdef",
    );

    assert.equal(status.connectedAccountId, "acct_123…cdef");
    assert.equal(status.onlinePaymentsAvailable, true);
    assert.equal(status.paymentStatus, "connected");
  });
});

describe("parseCheckoutSessionConnectedAccountId", () => {
  it("prefers event account over metadata", () => {
    assert.equal(
      parseCheckoutSessionConnectedAccountId(
        { metadata: { connectedAccountId: "acct_meta" } } as never,
        "acct_event",
      ),
      "acct_event",
    );
  });
});

describe("isMockCheckoutAllowed", () => {
  it("allows mock checkout only outside production", () => {
    assert.equal(isMockCheckoutAllowed("development"), true);
    assert.equal(isMockCheckoutAllowed("production"), false);
  });

  it("blocks subscription mock billing in production the same way as order mock", () => {
    // Billing paths call isMockCheckoutAllowed() before returning mock checkout/portal URLs.
    assert.equal(isMockCheckoutAllowed("production"), false);
    assert.equal(isMockCheckoutAllowed("test"), true);
  });
});
