import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPlanAmount, subscriptionStatusLabel } from "./subscription-display.ts";

describe("subscription-display", () => {
  it("formats free and paid plan amounts", () => {
    assert.equal(formatPlanAmount(0), "Free");
    assert.equal(formatPlanAmount(29), "$29.00/mo");
    assert.equal(formatPlanAmount(299, "year"), "$299.00/yr");
  });

  it("labels all subscription statuses", () => {
    assert.equal(subscriptionStatusLabel("TRIAL"), "Trial");
    assert.equal(subscriptionStatusLabel("TRIALING"), "Trial");
    assert.equal(subscriptionStatusLabel("BETA"), "Beta");
    assert.equal(subscriptionStatusLabel("SUSPENDED"), "Suspended");
  });
});
