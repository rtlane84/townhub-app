import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLANK_EVENT_SUBMIT,
  buildEventSubmitPayload,
  clearEventSubmitFieldError,
  validateEventSubmitForm,
} from "./event-submit.ts";

describe("event submit validation", () => {
  it("requires title, start date, start time, name, and email", () => {
    const errors = validateEventSubmitForm(BLANK_EVENT_SUBMIT);
    assert.equal(errors.title, "Enter an event title.");
    assert.equal(errors.date, "Choose a start date.");
    assert.equal(errors.startTime, "Choose a start time.");
    assert.equal(errors.submitterName, "Enter your name.");
    assert.equal(errors.submitterEmail, "Enter your email.");
    assert.equal(errors.endDate, undefined);
    assert.equal(errors.endTime, undefined);
  });

  it("accepts a complete required set with blank optional fields", () => {
    const errors = validateEventSubmitForm({
      ...BLANK_EVENT_SUBMIT,
      title: "Farmers Market",
      date: "2026-07-20",
      startTime: "09:00:00",
      submitterName: "Ada",
      submitterEmail: "ada@example.com",
    });
    assert.deepEqual(errors, {});
  });

  it("rejects end date before start date and end time before start time", () => {
    const errors = validateEventSubmitForm({
      ...BLANK_EVENT_SUBMIT,
      title: "Market",
      date: "2026-07-20",
      endDate: "2026-07-19",
      startTime: "10:00",
      endTime: "09:00",
      submitterName: "Ada",
      submitterEmail: "ada@example.com",
    });
    assert.equal(errors.endDate, "End date must be on or after the start date.");
    assert.equal(errors.endTime, "End time must be after the start time.");
  });

  it("builds payload omitting blank optional fields and normalizing times", () => {
    const payload = buildEventSubmitPayload({
      ...BLANK_EVENT_SUBMIT,
      title: "  Market  ",
      date: "2026-07-20",
      endDate: "",
      startTime: "09:00:00",
      endTime: "",
      location: "  ",
      description: "",
      submitterName: " Ada ",
      submitterEmail: " ada@example.com ",
    });
    assert.equal(payload.title, "Market");
    assert.equal(payload.date, "2026-07-20");
    assert.equal(payload.endDate, undefined);
    assert.equal(payload.startTime, "09:00");
    assert.equal(payload.endTime, undefined);
    assert.equal(payload.location, undefined);
    assert.equal(payload.submitterName, "Ada");
    assert.equal(payload.submitterEmail, "ada@example.com");
  });

  it("clears a single field error", () => {
    const next = clearEventSubmitFieldError(
      { title: "Enter an event title.", date: "Choose a start date." },
      "title",
    );
    assert.deepEqual(next, { date: "Choose a start date." });
  });
});
