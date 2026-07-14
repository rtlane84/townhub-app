import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluatePublicAvailability } from "../../../../lib/api-zod/src/public-availability.ts";
import { getZonedParts } from "../../../../lib/api-zod/src/timezone.ts";

const TZ = "America/New_York";

function atZone(civilDate: string, hhmm: string, timeZone = TZ): Date {
  const [y, mo, d] = civilDate.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  let guess = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 4; i += 1) {
    const parts = getZonedParts(new Date(guess), timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    const target = Date.UTC(y, mo - 1, d, h, mi);
    guess += target - asUtc;
  }
  return new Date(guess);
}

const weekdayHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isClosed: dayOfWeek === 0 || dayOfWeek === 6,
  openTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
  closeTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
}));

const lateHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isClosed: false,
  openTime: "17:00",
  closeTime: "22:00",
}));

describe("evaluatePublicAvailability — fixed location", () => {
  it("before open morning", () => {
    // Monday 2026-07-13
    const now = atZone("2026-07-13", "08:00");
    const result = evaluatePublicAvailability(
      { active: true, structuredHours: weekdayHours },
      now,
      TZ,
    );
    assert.equal(result.isOpen, false);
    assert.equal(result.statusLabel, "Closed");
    assert.equal(result.scheduleLabel, "Opens 9 AM");
  });

  it("during open afternoon", () => {
    const now = atZone("2026-07-13", "14:30");
    const result = evaluatePublicAvailability(
      { active: true, structuredHours: weekdayHours },
      now,
      TZ,
    );
    assert.equal(result.isOpen, true);
    assert.equal(result.statusLabel, "Open now");
    assert.equal(result.scheduleLabel, "Closes 5 PM");
  });

  it("after close same day → opens tomorrow", () => {
    const now = atZone("2026-07-13", "18:00");
    const result = evaluatePublicAvailability(
      { active: true, structuredHours: weekdayHours },
      now,
      TZ,
    );
    assert.equal(result.isOpen, false);
    assert.equal(result.statusLabel, "Closed");
    assert.equal(result.scheduleLabel, "Opens tomorrow 9 AM");
  });

  it("Friday evening → opens next weekday Mon", () => {
    const now = atZone("2026-07-17", "19:00"); // Friday
    const result = evaluatePublicAvailability(
      { active: true, structuredHours: weekdayHours },
      now,
      TZ,
    );
    assert.equal(result.isOpen, false);
    assert.equal(result.statusLabel, "Closed");
    assert.equal(result.scheduleLabel, "Opens Mon 9 AM");
  });

  it("closed weekdays (weekend)", () => {
    const now = atZone("2026-07-12", "12:00"); // Sunday
    const result = evaluatePublicAvailability(
      { active: true, structuredHours: weekdayHours },
      now,
      TZ,
    );
    assert.equal(result.isOpen, false);
    assert.equal(result.scheduleLabel, "Opens tomorrow 9 AM");
  });

  it("missing / malformed hours → Hours not provided", () => {
    assert.equal(
      evaluatePublicAvailability({ active: true }, atZone("2026-07-13", "12:00"), TZ)
        .statusLabel,
      "Hours not provided",
    );
    assert.equal(
      evaluatePublicAvailability(
        { active: true, structuredHours: "not-json" },
        atZone("2026-07-13", "12:00"),
        TZ,
      ).statusLabel,
      "Hours not provided",
    );
    assert.equal(
      evaluatePublicAvailability(
        {
          active: true,
          hoursEnabled: false,
          structuredHours: weekdayHours,
        },
        atZone("2026-07-13", "12:00"),
        TZ,
      ).statusLabel,
      "Hours not provided",
    );
  });

  it("late evening hours before open and during", () => {
    const before = evaluatePublicAvailability(
      { active: true, structuredHours: lateHours },
      atZone("2026-07-13", "16:00"),
      TZ,
    );
    assert.equal(before.scheduleLabel, "Opens 5 PM");
    const during = evaluatePublicAvailability(
      { active: true, structuredHours: lateHours },
      atZone("2026-07-13", "20:00"),
      TZ,
    );
    assert.equal(during.isOpen, true);
    assert.equal(during.scheduleLabel, "Closes 10 PM");
  });

  it("overnight hours are unsupported (fail safe closed)", () => {
    const overnight = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      isClosed: false,
      openTime: "22:00",
      closeTime: "02:00",
    }));
    const result = evaluatePublicAvailability(
      { active: true, structuredHours: overnight },
      atZone("2026-07-13", "23:00"),
      TZ,
    );
    assert.equal(result.isOpen, false);
  });

  it("inactive business is Closed", () => {
    const result = evaluatePublicAvailability(
      { active: false, structuredHours: weekdayHours },
      atZone("2026-07-13", "12:00"),
      TZ,
    );
    assert.equal(result.statusLabel, "Closed");
    assert.equal(result.isOpen, false);
  });
});

describe("evaluatePublicAvailability — mobile", () => {
  it("active stop with name and end time", () => {
    const now = atZone("2026-07-13", "12:00");
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-13",
            startTime: "11:00",
            endTime: "20:00",
            isActive: true,
            locationName: "Town Square",
          },
        ],
      },
      now,
      TZ,
    );
    assert.equal(result.isOpen, true);
    assert.equal(result.statusLabel, "Town Square");
    assert.equal(result.scheduleLabel, "Here until 8 PM");
    assert.equal(result.locationName, "Town Square");
  });

  it("active stop without name → Here now", () => {
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-13",
            startTime: "09:00",
            endTime: "17:00",
            isActive: true,
          },
        ],
      },
      atZone("2026-07-13", "12:00"),
      TZ,
    );
    assert.equal(result.statusLabel, "Here now");
    assert.equal(result.scheduleLabel, "Here until 5 PM");
  });

  it("next stop tonight 9 PM", () => {
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-13",
            startTime: "21:00",
            endTime: "23:00",
            isActive: true,
          },
        ],
      },
      atZone("2026-07-13", "18:00"),
      TZ,
    );
    assert.equal(result.isOpen, false);
    assert.equal(result.scheduleLabel, "Next stop tonight 9 PM");
  });

  it("next stop tomorrow morning", () => {
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-14",
            startTime: "09:00",
            endTime: "14:00",
            isActive: true,
          },
        ],
      },
      atZone("2026-07-13", "20:00"),
      TZ,
    );
    assert.equal(result.scheduleLabel, "Next stop tomorrow 9 AM");
  });

  it("next stop later weekday", () => {
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-15",
            startTime: "11:00",
            endTime: "15:00",
            isActive: true,
          },
        ],
      },
      atZone("2026-07-13", "12:00"),
      TZ,
    );
    assert.equal(result.scheduleLabel, "Next stop Wed 11 AM");
  });

  it("multiple stops — prefers active, then soonest upcoming", () => {
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-13",
            startTime: "08:00",
            endTime: "10:00",
            isActive: true,
            locationName: "Past Park",
          },
          {
            locationDate: "2026-07-13",
            startTime: "16:00",
            endTime: "20:00",
            isActive: true,
            locationName: "Evening Lot",
          },
        ],
      },
      atZone("2026-07-13", "12:00"),
      TZ,
    );
    assert.equal(result.scheduleLabel, "Next stop tonight 4 PM");
  });

  it("inactive stops ignored", () => {
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-13",
            startTime: "09:00",
            endTime: "17:00",
            isActive: false,
            locationName: "Hidden",
          },
        ],
      },
      atZone("2026-07-13", "12:00"),
      TZ,
    );
    assert.equal(result.statusLabel, "Not currently at a scheduled stop");
  });

  it("today stop without times → Check today's location schedule", () => {
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-13",
            isActive: true,
            locationName: "Somewhere",
          },
        ],
      },
      atZone("2026-07-13", "23:00"),
      TZ,
    );
    // Whole-day stop is active all day; at end of day still "here" without end.
    assert.equal(result.isOpen, true);
    assert.equal(result.statusLabel, "Somewhere");
  });

  it("does not fall back to Hours not provided for mobile with hours disabled", () => {
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        hoursEnabled: false,
        structuredHours: weekdayHours,
        mobileLocations: [],
      },
      atZone("2026-07-13", "12:00"),
      TZ,
    );
    assert.notEqual(result.statusLabel, "Hours not provided");
    assert.equal(result.statusLabel, "Not currently at a scheduled stop");
  });

  it("overnight mobile stop unsupported (fail safe)", () => {
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-13",
            startTime: "22:00",
            endTime: "02:00",
            isActive: true,
          },
        ],
      },
      atZone("2026-07-13", "23:00"),
      TZ,
    );
    assert.equal(result.isOpen, false);
  });

  it("uses platform TZ across UTC midnight boundary", () => {
    // 2026-07-13 23:30 ET = already 2026-07-14 UTC
    const now = atZone("2026-07-13", "23:30");
    assert.equal(now.toISOString().slice(0, 10), "2026-07-14");
    const result = evaluatePublicAvailability(
      {
        active: true,
        isMobileBusiness: true,
        mobileLocations: [
          {
            locationDate: "2026-07-13",
            startTime: "18:00",
            endTime: "23:45",
            isActive: true,
            locationName: "Night Market",
          },
        ],
      },
      now,
      TZ,
    );
    assert.equal(result.isOpen, true);
    assert.equal(result.locationName, "Night Market");
  });
});
