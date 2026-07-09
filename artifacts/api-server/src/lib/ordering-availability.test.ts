import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateOrderingAvailability,
  hasActiveMobileLocationNow,
  resolveOrderingAvailabilityMode,
} from "../../../../lib/api-zod/src/ordering-availability.ts";

describe("ordering-availability", () => {
  it("defaults unknown modes to ALWAYS", () => {
    assert.equal(resolveOrderingAvailabilityMode({}), "ALWAYS");
    assert.equal(resolveOrderingAvailabilityMode({ orderingAvailabilityMode: "NOPE" }), "ALWAYS");
  });

  it("ALWAYS allows active businesses", () => {
    const result = evaluateOrderingAvailability({
      active: true,
      archivedAt: null,
      orderingAvailabilityMode: "ALWAYS",
    });
    assert.equal(result.available, true);
  });

  it("MANUAL respects orderingEnabled toggle", () => {
    assert.equal(
      evaluateOrderingAvailability({
        active: true,
        orderingAvailabilityMode: "MANUAL",
        orderingEnabled: false,
      }).available,
      false,
    );
    assert.equal(
      evaluateOrderingAvailability({
        active: true,
        orderingAvailabilityMode: "MANUAL",
        orderingEnabled: true,
      }).available,
      true,
    );
  });

  it("BUSINESS_HOURS uses structured hours", () => {
    const wednesdayNoon = new Date("2026-07-08T12:00:00");
    const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      isClosed: dayOfWeek === 0 || dayOfWeek === 6,
      openTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
      closeTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
    }));

    assert.equal(
      evaluateOrderingAvailability(
        {
          active: true,
          orderingAvailabilityMode: "BUSINESS_HOURS",
          structuredHours: hours,
        },
        wednesdayNoon,
      ).available,
      true,
    );

    const wednesdayNight = new Date("2026-07-08T20:00:00");
    assert.equal(
      evaluateOrderingAvailability(
        {
          active: true,
          orderingAvailabilityMode: "BUSINESS_HOURS",
          structuredHours: hours,
        },
        wednesdayNight,
      ).available,
      false,
    );
  });

  it("hasActiveMobileLocationNow matches today and time window", () => {
    const now = new Date("2026-07-09T12:30:00");
    assert.equal(
      hasActiveMobileLocationNow(
        [{ locationDate: "2026-07-09", startTime: "11:00", endTime: "14:00", isActive: true }],
        now,
      ),
      true,
    );
    assert.equal(
      hasActiveMobileLocationNow(
        [{ locationDate: "2026-07-09", startTime: "15:00", endTime: "18:00", isActive: true }],
        now,
      ),
      false,
    );
    assert.equal(
      hasActiveMobileLocationNow(
        [{ locationDate: "2026-07-08", startTime: "11:00", endTime: "14:00", isActive: true }],
        now,
      ),
      false,
    );
  });

  it("MOBILE_LOCATION_SCHEDULE requires an active location", () => {
    const now = new Date("2026-07-09T12:30:00");
    assert.equal(
      evaluateOrderingAvailability(
        {
          active: true,
          orderingAvailabilityMode: "MOBILE_LOCATION_SCHEDULE",
          mobileLocations: [
            { locationDate: "2026-07-09", startTime: "11:00", endTime: "14:00", isActive: true },
          ],
        },
        now,
      ).available,
      true,
    );
    assert.equal(
      evaluateOrderingAvailability(
        {
          active: true,
          orderingAvailabilityMode: "MOBILE_LOCATION_SCHEDULE",
          mobileLocations: [],
        },
        now,
      ).available,
      false,
    );
  });
});
