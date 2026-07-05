import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVE_ORDER_LIST_DEFAULT_SINCE_DAYS,
  getDefaultActiveOrdersSince,
  parseBusinessOrderListQuery,
} from "./order-list-query";

describe("parseBusinessOrderListQuery", () => {
  it("defaults activeOnly lists to a recent lookback window", () => {
    const parsed = parseBusinessOrderListQuery({ activeOnly: "true" });
    assert.equal(parsed.activeOnly, true);
    assert.ok(parsed.since);
    const expected = getDefaultActiveOrdersSince();
    assert.equal(parsed.since?.toISOString(), expected.toISOString());
  });

  it("honors explicit since and status filters", () => {
    const parsed = parseBusinessOrderListQuery({
      activeOnly: "true",
      since: "2026-06-01T00:00:00.000Z",
      status: "NEW",
    });
    assert.equal(parsed.status, "NEW");
    assert.equal(parsed.since?.toISOString(), "2026-06-01T00:00:00.000Z");
  });

  it("leaves full-history lists unfiltered when no activeOnly flag is set", () => {
    const parsed = parseBusinessOrderListQuery({});
    assert.equal(parsed.activeOnly, false);
    assert.equal(parsed.since, null);
  });

  it("uses the configured default lookback length", () => {
    assert.equal(ACTIVE_ORDER_LIST_DEFAULT_SINCE_DAYS, 30);
  });
});
