import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEventDayIndicators, eventDotClass } from "./event-calendar.ts";

describe("event calendar indicators", () => {
  it("aggregates multi-day events and unique types", () => {
    const map = buildEventDayIndicators([
      {
        date: "2026-07-20",
        endDate: "2026-07-21",
        eventType: "MARKET",
      },
      {
        date: "2026-07-20",
        endDate: null,
        eventType: "COMMUNITY",
      },
      {
        date: "2026-07-20",
        endDate: null,
        eventType: "MARKET",
      },
    ]);

    const day20 = map.get("2026-07-20");
    assert.ok(day20);
    assert.equal(day20.count, 3);
    assert.deepEqual(day20.types, ["MARKET", "COMMUNITY"]);

    const day21 = map.get("2026-07-21");
    assert.ok(day21);
    assert.equal(day21.count, 1);
    assert.deepEqual(day21.types, ["MARKET"]);
  });

  it("maps known types to solid indicator classes", () => {
    assert.match(eventDotClass("FOOD_TRUCK"), /orange/);
    assert.match(eventDotClass("UNKNOWN"), /slate/);
  });
});
