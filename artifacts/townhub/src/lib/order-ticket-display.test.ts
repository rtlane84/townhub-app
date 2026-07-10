import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatOrderReferenceLabel,
  formatOrderReferenceNumber,
  formatOrderTicketNumber,
} from "../../../../lib/api-zod/src/order-ticket-display.ts";

describe("order-ticket-display", () => {
  it("formatOrderTicketNumber prefers businessOrderNumber when provided", () => {
    assert.equal(formatOrderTicketNumber(109, "Order", 101), "Order #101");
    assert.equal(formatOrderTicketNumber(109, "Ticket", 102), "Ticket #102");
  });

  it("formatOrderTicketNumber falls back to id when businessOrderNumber is missing", () => {
    assert.equal(formatOrderTicketNumber(109), "Order #109");
    assert.equal(formatOrderTicketNumber(109, "Ticket", null), "Ticket #109");
  });

  it("formatOrderTicketNumber uses numeric id with Order prefix by default", () => {
    assert.equal(formatOrderTicketNumber(109), "Order #109");
  });

  it("formatOrderTicketNumber supports Ticket prefix for kitchen contexts", () => {
    assert.equal(formatOrderTicketNumber(109, "Ticket"), "Ticket #109");
  });

  it("formatOrderReferenceNumber trims and returns null for empty values", () => {
    assert.equal(formatOrderReferenceNumber("TH-20260706-PIPGR"), "TH-20260706-PIPGR");
    assert.equal(formatOrderReferenceNumber("  "), null);
    assert.equal(formatOrderReferenceNumber(null), null);
  });

  it("formatOrderReferenceLabel prefixes the long order number", () => {
    assert.equal(
      formatOrderReferenceLabel("TH-20260706-PIPGR"),
      "Reference: TH-20260706-PIPGR",
    );
    assert.equal(formatOrderReferenceLabel(""), null);
  });
});
