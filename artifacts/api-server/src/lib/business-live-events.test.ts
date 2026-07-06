import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  BUSINESS_LIVE_EVENT_TYPES,
  formatBusinessLiveSseComment,
  formatBusinessLiveSseMessage,
  publishOrderCreatedLiveEvent,
  publishOrderUpdatedLiveEvent,
  resetBusinessLiveEventBusForTests,
  subscribeBusinessLiveEvents,
  type BusinessLiveEvent,
  type BusinessLiveEventPayload,
} from "./business-live-events.ts";

const PII_FIELD_PATTERN =
  /email|phone|address|token|stripe|customer|notes|name|secret|password/i;

function assertPayloadExcludesPii(payload: BusinessLiveEventPayload): void {
  for (const key of Object.keys(payload)) {
    assert.ok(!PII_FIELD_PATTERN.test(key), `Unexpected PII-like field: ${key}`);
  }
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /email|phone|customerName|accessToken|stripe/i);
}

describe("business-live-events bus", () => {
  beforeEach(() => {
    resetBusinessLiveEventBusForTests();
  });

  it("formats valid SSE messages and heartbeat comments", () => {
    const event: BusinessLiveEvent = {
      type: "heartbeat",
      data: { businessId: 1, timestamp: "2026-07-06T12:00:00.000Z" },
    };
    const message = formatBusinessLiveSseMessage(event);
    assert.ok(message.startsWith("event: heartbeat"));
    assert.ok(message.includes("data: "));
    assert.match(formatBusinessLiveSseComment("keep-alive"), /^: keep-alive/);
  });

  it("publishes only to subscribers for the same business", () => {
    const receivedA: BusinessLiveEvent[] = [];
    const receivedB: BusinessLiveEvent[] = [];

    subscribeBusinessLiveEvents(1, (event) => receivedA.push(event));
    subscribeBusinessLiveEvents(2, (event) => receivedB.push(event));

    publishOrderCreatedLiveEvent(1, 42, "NEW");

    assert.equal(receivedA.length, 1);
    assert.equal(receivedB.length, 0);
    assert.equal(receivedA[0]?.type, "order.created");
    assert.equal(receivedA[0]?.data.orderId, 42);
    assert.equal(receivedA[0]?.data.businessId, 1);
  });

  it("event payload excludes PII fields", () => {
    const sample: BusinessLiveEventPayload = {
      businessId: 1,
      orderId: 9,
      appointmentId: 3,
      status: "NEW",
      timestamp: new Date().toISOString(),
    };
    assertPayloadExcludesPii(sample);

    const message = formatBusinessLiveSseMessage({
      type: "order.updated",
      data: sample,
    });
    assert.doesNotMatch(message, /email|phone|customer/i);
  });

  it("includes order and appointment update events in the catalog", () => {
    assert.ok(BUSINESS_LIVE_EVENT_TYPES.includes("order.paid"));
    assert.ok(BUSINESS_LIVE_EVENT_TYPES.includes("order.refunded"));
    assert.ok(BUSINESS_LIVE_EVENT_TYPES.includes("appointment.created"));
    assert.ok(BUSINESS_LIVE_EVENT_TYPES.includes("appointment.updated"));
  });

  it("unsubscribes listeners cleanly", () => {
    const received: BusinessLiveEvent[] = [];
    const unsubscribe = subscribeBusinessLiveEvents(1, (event) => received.push(event));
    unsubscribe();
    publishOrderUpdatedLiveEvent(1, 5, "READY");
    assert.equal(received.length, 0);
  });
});
