import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTime12h,
  formatTimeRange12h,
  isEndTimeAfterStart,
  parseTimeToHHmm,
  snapTimeToIncrement,
} from "@workspace/api-zod";

describe("time utilities", () => {
  it("parses HH:mm and snaps to 15-minute increments", () => {
    assert.equal(parseTimeToHHmm("09:00"), "09:00");
    assert.equal(parseTimeToHHmm("14:30"), "14:30");
    assert.equal(parseTimeToHHmm("09:07"), "09:00");
    assert.equal(parseTimeToHHmm("09:08"), "09:15");
  });

  it("parses 12-hour times for backwards compatibility", () => {
    assert.equal(parseTimeToHHmm("9:00 AM"), "09:00");
    assert.equal(parseTimeToHHmm("2:30 PM"), "14:30");
    assert.equal(parseTimeToHHmm("3pm"), "15:00");
    assert.equal(parseTimeToHHmm("3pm same day"), "15:00");
  });

  it("formats friendly 12-hour display", () => {
    assert.equal(formatTime12h("09:00"), "9:00 AM");
    assert.equal(formatTime12h("14:30"), "2:30 PM");
    assert.equal(formatTime12h("legacy note"), "legacy note");
  });

  it("formats time ranges", () => {
    assert.equal(formatTimeRange12h("09:00", "14:30"), "9:00 AM – 2:30 PM");
    assert.equal(formatTimeRange12h("09:00", null), "9:00 AM");
  });

  it("validates end after start", () => {
    assert.equal(isEndTimeAfterStart("09:00", "17:00"), true);
    assert.equal(isEndTimeAfterStart("17:00", "09:00"), false);
    assert.equal(isEndTimeAfterStart("09:00", "09:00"), false);
  });

  it("snaps times to increments", () => {
    assert.equal(snapTimeToIncrement("23:50"), "23:45");
  });
});
