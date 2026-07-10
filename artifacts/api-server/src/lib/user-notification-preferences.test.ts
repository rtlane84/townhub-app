import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolvePreferencesFromRows } from "./user-notification-preferences-resolve.ts";

describe("user-notification-preferences-resolve", () => {
  it("defaults categories to enabled when no rows exist", () => {
    const prefs = resolvePreferencesFromRows([], {
      audience: "CUSTOMER",
      implementedOnly: true,
    });
    assert.ok(prefs.length > 0);
    assert.ok(prefs.every((p) => p.enabled && !p.explicit));
  });

  it("applies explicit disabled rows", () => {
    const prefs = resolvePreferencesFromRows(
      [{ category: "CUSTOMER_ORDER_ACCEPTED", enabled: false }],
      {
        audience: "CUSTOMER",
        implementedOnly: true,
      },
    );
    const accepted = prefs.find((p) => p.category === "CUSTOMER_ORDER_ACCEPTED");
    assert.equal(accepted?.enabled, false);
    assert.equal(accepted?.explicit, true);
  });
});
