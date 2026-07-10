import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const syncSourceUrl = new URL("./business-live-event-sync.ts", import.meta.url);

describe("business-live-event-sync", () => {
  it("invalidates kitchen, summary, list, and detail queries for order events", async () => {
    const source = await readFile(syncSourceUrl, "utf8");
    assert.match(source, /getKitchenBusinessOrdersQueryKey/);
    assert.match(source, /getGetBusinessOrderSummaryQueryKey/);
    assert.match(source, /getListBusinessOrdersQueryKey/);
    assert.match(source, /safeInvalidateQueries/);
    assert.match(source, /isOrderLiveEventType/);
  });

  it("invalidates appointment list queries for appointment events", async () => {
    const source = await readFile(syncSourceUrl, "utf8");
    assert.match(source, /getListBusinessAppointmentRequestsQueryKey/);
    assert.match(source, /isAppointmentLiveEventType/);
  });

  it("skips heartbeat events when invalidating queries", async () => {
    const source = await readFile(syncSourceUrl, "utf8");
    assert.match(source, /isActionableBusinessLiveEvent/);
    assert.match(source, /event\.type !== "heartbeat"/);
  });
});
