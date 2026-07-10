import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSubscriptionActivated, isSubscriptionReady } from "./subscription-activation.ts";

describe("subscription activation", () => {
  it("treats trial and active statuses as activated", () => {
    assert.equal(isSubscriptionActivated("TRIAL"), true);
    assert.equal(isSubscriptionActivated("ACTIVE"), true);
    assert.equal(isSubscriptionActivated("INCOMPLETE"), false);
  });

  it("requires activated status without pending checkout to be ready", () => {
    assert.equal(
      isSubscriptionReady({
        status: "TRIAL",
        stripeSubscriptionId: "sub_1",
        plan: { monthlyPrice: 20, yearlyPrice: 100, isBeta: false, trialDays: 30 } as never,
      }),
      true,
    );
    assert.equal(
      isSubscriptionReady({
        status: "INCOMPLETE",
        stripeSubscriptionId: null,
        plan: { monthlyPrice: 20, yearlyPrice: 100, isBeta: false, trialDays: 30 } as never,
      }),
      false,
    );
  });
});
