import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  isBusinessOpenForPublicCommerce,
  evaluateBusinessOrderingAvailability,
} from "./business-commerce-eligibility";

describe("isBusinessOpenForPublicCommerce", () => {
  it("accepts active, non-archived businesses", () => {
    assert.equal(isBusinessOpenForPublicCommerce({ active: true, archivedAt: null }), true);
  });

  it("rejects inactive businesses", () => {
    assert.equal(isBusinessOpenForPublicCommerce({ active: false, archivedAt: null }), false);
  });

  it("rejects archived businesses", () => {
    assert.equal(
      isBusinessOpenForPublicCommerce({ active: true, archivedAt: new Date() }),
      false,
    );
  });
});

describe("evaluateBusinessOrderingAvailability", () => {
  it("blocks MANUAL mode when orderingEnabled is false", () => {
    const result = evaluateBusinessOrderingAvailability({
      active: true,
      orderingAvailabilityMode: "MANUAL",
      orderingEnabled: false,
    });
    assert.equal(result.available, false);
  });

  it("allows BUSINESS_HOURS when open", () => {
    const wednesdayNoon = new Date("2026-07-08T12:00:00");
    const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      isClosed: false,
      openTime: "09:00",
      closeTime: "17:00",
    }));
    const result = evaluateBusinessOrderingAvailability(
      {
        active: true,
        orderingAvailabilityMode: "BUSINESS_HOURS",
        structuredHours: hours,
      },
      { now: wednesdayNoon },
    );
    assert.equal(result.available, true);
  });
});

describe("business-order-number allocation", () => {
  it("uses an atomic UPDATE … RETURNING pattern", () => {
    const source = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "business-order-number.ts"),
      "utf8",
    );
    assert.match(source, /next_business_order_number = next_business_order_number \+ 1/);
    assert.match(source, /RETURNING next_business_order_number - 1/);
  });
});
