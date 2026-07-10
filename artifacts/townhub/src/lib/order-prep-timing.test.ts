import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBusinessOrderTimingLabel,
  getCustomerEstimatedWindowLabel,
  isActiveOrderForTiming,
} from "./order-prep-timing.ts";

describe("order-prep-timing", () => {
  it("formats customer confirmation window labels", () => {
    const label = getCustomerEstimatedWindowLabel({
      fulfillmentType: "PICKUP",
      estimatedWindowStart: "2026-07-04T16:25:00.000Z",
      estimatedWindowEnd: "2026-07-04T16:35:00.000Z",
    });

    assert.match(label, /Estimated pickup:/i);
    assert.match(label, /–/);
  });

  it("shows due and overdue labels for active orders", () => {
    const due = getBusinessOrderTimingLabel(
      {
        status: "PREPARING",
        estimatedWindowEnd: new Date("2026-07-04T12:12:00.000Z").toISOString(),
      },
      new Date("2026-07-04T12:00:00.000Z"),
    );
    const overdue = getBusinessOrderTimingLabel(
      {
        status: "PREPARING",
        estimatedWindowEnd: new Date("2026-07-04T12:00:00.000Z").toISOString(),
      },
      new Date("2026-07-04T12:08:00.000Z"),
    );

    assert.equal(due, "Due in 12 min");
    assert.equal(overdue, "Overdue by 8 min");
  });

  it("hides timing labels for completed orders", () => {
    assert.equal(isActiveOrderForTiming("COMPLETED"), false);
    assert.equal(
      getBusinessOrderTimingLabel({
        status: "COMPLETED",
        estimatedWindowEnd: new Date("2026-07-04T12:00:00.000Z").toISOString(),
      }),
      null,
    );
  });
});
