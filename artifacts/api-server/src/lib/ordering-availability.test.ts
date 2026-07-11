import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateOrderingAvailability,
  hasActiveMobileLocationNow,
  ORDERING_UNAVAILABLE_MESSAGES,
  resolveOrderClosingBufferMinutes,
  resolveOrderingAvailabilityMode,
} from "../../../../lib/api-zod/src/ordering-availability.ts";
import { evaluateBusinessOrderingAvailability } from "./business-commerce-eligibility.ts";

const weekdayHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isClosed: dayOfWeek === 0 || dayOfWeek === 6,
  openTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
  closeTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
}));

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
    assert.equal(
      evaluateOrderingAvailability(
        {
          active: true,
          orderingAvailabilityMode: "BUSINESS_HOURS",
          structuredHours: weekdayHours,
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
          structuredHours: weekdayHours,
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

describe("orderClosingBufferMinutes", () => {
  it("treats blank/null as 0 and clamps to 240", () => {
    assert.equal(resolveOrderClosingBufferMinutes(null), 0);
    assert.equal(resolveOrderClosingBufferMinutes(""), 0);
    assert.equal(resolveOrderClosingBufferMinutes(-5), 0);
    assert.equal(resolveOrderClosingBufferMinutes(30.9), 30);
    assert.equal(resolveOrderClosingBufferMinutes(999), 240);
  });

  it("ignores buffer for ALWAYS and MANUAL", () => {
    const almostClose = new Date("2026-07-08T16:50:00");
    assert.equal(
      evaluateOrderingAvailability(
        {
          active: true,
          orderingAvailabilityMode: "ALWAYS",
          orderClosingBufferMinutes: 60,
          structuredHours: weekdayHours,
        },
        almostClose,
      ).available,
      true,
    );
    assert.equal(
      evaluateOrderingAvailability(
        {
          active: true,
          orderingAvailabilityMode: "MANUAL",
          orderingEnabled: true,
          orderClosingBufferMinutes: 60,
          structuredHours: weekdayHours,
        },
        almostClose,
      ).available,
      true,
    );
  });

  it("BUSINESS_HOURS: buffer 0 allows until exact close; at close is blocked", () => {
    const beforeClose = new Date("2026-07-08T16:59:00");
    const atClose = new Date("2026-07-08T17:00:00");
    const base = {
      active: true as const,
      orderingAvailabilityMode: "BUSINESS_HOURS" as const,
      structuredHours: weekdayHours,
      orderClosingBufferMinutes: 0,
    };
    assert.equal(evaluateOrderingAvailability(base, beforeClose).available, true);
    assert.equal(evaluateOrderingAvailability(base, atClose).available, false);
    assert.equal(
      evaluateOrderingAvailability(base, atClose).reason,
      ORDERING_UNAVAILABLE_MESSAGES.businessHours,
    );
  });

  it("BUSINESS_HOURS: N-minute buffer blocks before close with closingEnded reason", () => {
    // close 17:00, buffer 30 → effective close 16:30
    const beforeBuffer = new Date("2026-07-08T16:29:00");
    const atEffectiveClose = new Date("2026-07-08T16:30:00");
    const stillBeforeRealClose = new Date("2026-07-08T16:45:00");
    const base = {
      active: true as const,
      orderingAvailabilityMode: "BUSINESS_HOURS" as const,
      structuredHours: weekdayHours,
      orderClosingBufferMinutes: 30,
    };

    assert.equal(evaluateOrderingAvailability(base, beforeBuffer).available, true);

    const atBoundary = evaluateOrderingAvailability(base, atEffectiveClose);
    assert.equal(atBoundary.available, false);
    assert.equal(atBoundary.reason, ORDERING_UNAVAILABLE_MESSAGES.closingEnded);

    const inBufferWindow = evaluateOrderingAvailability(base, stillBeforeRealClose);
    assert.equal(inBufferWindow.available, false);
    assert.equal(inBufferWindow.reason, ORDERING_UNAVAILABLE_MESSAGES.closingEnded);
  });

  it("MOBILE_LOCATION_SCHEDULE: buffer applies to active stop endTime", () => {
    // end 14:00, buffer 15 → effective 13:45
    const locations = [
      { locationDate: "2026-07-09", startTime: "11:00", endTime: "14:00", isActive: true },
    ];
    const base = {
      active: true as const,
      orderingAvailabilityMode: "MOBILE_LOCATION_SCHEDULE" as const,
      mobileLocations: locations,
      orderClosingBufferMinutes: 15,
    };

    assert.equal(
      evaluateOrderingAvailability(base, new Date("2026-07-09T13:44:00")).available,
      true,
    );
    const blocked = evaluateOrderingAvailability(base, new Date("2026-07-09T13:45:00"));
    assert.equal(blocked.available, false);
    assert.equal(blocked.reason, ORDERING_UNAVAILABLE_MESSAGES.closingEnded);
    assert.equal(
      hasActiveMobileLocationNow(locations, new Date("2026-07-09T13:50:00"), 15),
      false,
    );
    assert.equal(
      hasActiveMobileLocationNow(locations, new Date("2026-07-09T13:50:00"), 0),
      true,
    );
  });

  it("BUSINESS_HOURS: buffer values 1, 30, and 240 enforce exact boundaries", () => {
    const base = {
      active: true as const,
      orderingAvailabilityMode: "BUSINESS_HOURS" as const,
      structuredHours: weekdayHours,
    };

    // close 17:00, buffer 1 → effective 16:59
    assert.equal(
      evaluateOrderingAvailability(
        { ...base, orderClosingBufferMinutes: 1 },
        new Date("2026-07-08T16:58:00"),
      ).available,
      true,
    );
    assert.equal(
      evaluateOrderingAvailability(
        { ...base, orderClosingBufferMinutes: 1 },
        new Date("2026-07-08T16:59:00"),
      ).available,
      false,
    );

    // buffer 30 → effective 16:30
    assert.equal(
      evaluateOrderingAvailability(
        { ...base, orderClosingBufferMinutes: 30 },
        new Date("2026-07-08T16:29:00"),
      ).available,
      true,
    );
    assert.equal(
      evaluateOrderingAvailability(
        { ...base, orderClosingBufferMinutes: 30 },
        new Date("2026-07-08T16:30:00"),
      ).available,
      false,
    );

    // buffer 240 → effective 13:00 (09:00–17:00)
    assert.equal(
      evaluateOrderingAvailability(
        { ...base, orderClosingBufferMinutes: 240 },
        new Date("2026-07-08T12:59:00"),
      ).available,
      true,
    );
    assert.equal(
      evaluateOrderingAvailability(
        { ...base, orderClosingBufferMinutes: 240 },
        new Date("2026-07-08T13:00:00"),
      ).available,
      false,
    );
  });

  it("floors decimals and coerces empty/invalid the same way for UI and API writers", () => {
    assert.equal(resolveOrderClosingBufferMinutes("30.9"), 30);
    assert.equal(resolveOrderClosingBufferMinutes("  "), 0);
    assert.equal(resolveOrderClosingBufferMinutes(undefined), 0);
    assert.equal(resolveOrderClosingBufferMinutes(null), 0);
    assert.equal(resolveOrderClosingBufferMinutes(-1), 0);
    assert.equal(resolveOrderClosingBufferMinutes(241), 240);
  });

  it("evaluateBusinessOrderingAvailability forwards buffer for hours mode", () => {
    const result = evaluateBusinessOrderingAvailability(
      {
        active: true,
        orderingAvailabilityMode: "BUSINESS_HOURS",
        structuredHours: weekdayHours,
        orderClosingBufferMinutes: 30,
      },
      { now: new Date("2026-07-08T16:45:00") },
    );
    assert.equal(result.available, false);
    assert.equal(result.reason, ORDERING_UNAVAILABLE_MESSAGES.closingEnded);
  });
});
