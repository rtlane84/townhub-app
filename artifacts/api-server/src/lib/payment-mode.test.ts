import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPaymentModeToUpdate } from "./payment-mode.ts";

describe("applyPaymentModeToUpdate", () => {
  it("applies a valid payment mode", () => {
    const updateData: Record<string, unknown> = {};
    applyPaymentModeToUpdate(updateData, { paymentMode: "BOTH" });
    assert.equal(updateData.paymentMode, "BOTH");
    assert.equal(updateData.payAtPickupEnabled, true);
  });

  it("ignores invalid payment mode instead of throwing", () => {
    const updateData: Record<string, unknown> = {};
    assert.doesNotThrow(() => {
      applyPaymentModeToUpdate(updateData, { paymentMode: "INVALID" });
    });
    assert.equal(updateData.paymentMode, undefined);
  });

  it("falls back to payAtPickupEnabled when payment mode is null", () => {
    const updateData: Record<string, unknown> = {};
    applyPaymentModeToUpdate(updateData, { paymentMode: null, payAtPickupEnabled: false });
    assert.equal(updateData.paymentMode, "ONLINE_ONLY");
    assert.equal(updateData.payAtPickupEnabled, false);
  });
});
