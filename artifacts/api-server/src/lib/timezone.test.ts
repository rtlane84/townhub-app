import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PLATFORM_TIMEZONE,
  addCivilDays,
  formatCivilDateHeading,
  formatCivilDateInTimeZone,
  formatCivilWeekdayShort,
  getZonedParts,
  isCivilDateString,
  isValidIanaTimeZone,
  parseCivilDateString,
  resolvePlatformTimeZone,
} from "../../../../lib/api-zod/src/timezone.ts";

/** Build a Date whose wall-clock in `timeZone` matches the civil date + HH:mm. */
function atZone(
  civilDate: string,
  hhmm: string,
  timeZone: string,
): Date {
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

describe("timezone helpers", () => {
  it("validates IANA timezones", () => {
    assert.equal(isValidIanaTimeZone("America/New_York"), true);
    assert.equal(isValidIanaTimeZone("UTC"), true);
    assert.equal(isValidIanaTimeZone("Not/A_Zone"), false);
    assert.equal(isValidIanaTimeZone(""), false);
    assert.equal(isValidIanaTimeZone(null), false);
  });

  it("resolves invalid zones to the platform default", () => {
    assert.equal(resolvePlatformTimeZone("America/Chicago"), "America/Chicago");
    assert.equal(resolvePlatformTimeZone("nope"), DEFAULT_PLATFORM_TIMEZONE);
    assert.equal(resolvePlatformTimeZone(undefined), DEFAULT_PLATFORM_TIMEZONE);
  });

  it("formats civil YYYY-MM-DD in a timezone without UTC day-shift", () => {
    // 2026-07-13 23:30 America/New_York = 2026-07-14 03:30 UTC
    const lateEvening = atZone("2026-07-13", "23:30", "America/New_York");
    assert.equal(
      lateEvening.toISOString().slice(0, 10),
      "2026-07-14",
      "UTC calendar date has already rolled",
    );
    assert.equal(
      formatCivilDateInTimeZone(lateEvening, "America/New_York"),
      "2026-07-13",
    );
  });

  it("interprets date-only values as civil dates (no UTC midnight shift)", () => {
    assert.deepEqual(parseCivilDateString("2026-07-13"), {
      year: 2026,
      month: 7,
      day: 13,
    });
    assert.equal(isCivilDateString("2026-02-30"), false);
    assert.equal(formatCivilWeekdayShort("2026-07-13"), "Mon");
    assert.match(formatCivilDateHeading("2026-07-13"), /Monday.*Jul.*13/);
  });

  it("returns zoned weekday/clock parts for explicit instants", () => {
    const noon = atZone("2026-07-13", "12:00", "America/New_York");
    const parts = getZonedParts(noon, "America/New_York");
    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 7);
    assert.equal(parts.day, 13);
    assert.equal(parts.hour, 12);
    assert.equal(parts.minute, 0);
    assert.equal(parts.weekday, 1); // Monday
  });

  it("handles DST spring-forward civil date continuity", () => {
    // 2026-03-08 America/New_York spring forward
    const before = atZone("2026-03-08", "01:30", "America/New_York");
    const after = atZone("2026-03-08", "03:30", "America/New_York");
    assert.equal(formatCivilDateInTimeZone(before, "America/New_York"), "2026-03-08");
    assert.equal(formatCivilDateInTimeZone(after, "America/New_York"), "2026-03-08");
    assert.equal(getZonedParts(after, "America/New_York").hour, 3);
  });

  it("handles DST fall-back civil date continuity", () => {
    // 2025-11-02 America/New_York fall back
    const afternoon = atZone("2025-11-02", "15:00", "America/New_York");
    assert.equal(
      formatCivilDateInTimeZone(afternoon, "America/New_York"),
      "2025-11-02",
    );
    assert.equal(addCivilDays("2025-11-02", 1), "2025-11-03");
  });
});
