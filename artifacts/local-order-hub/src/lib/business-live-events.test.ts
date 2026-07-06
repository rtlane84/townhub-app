import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  buildBusinessLiveEventsUrl,
  sseReconnectDelayMs,
  SSE_MAX_RECONNECT_ATTEMPTS,
} from "./business-live-events.ts";
import { resolveLiveIndicatorStatus } from "./business-live-indicator-status.ts";
import { parseSseBuffer, parseBusinessLiveEvent } from "./business-live-event-stream.ts";
import { assertLiveEventPayloadIsMinimal } from "./business-live-event-types.ts";

const hooksDir = new URL("../hooks/", import.meta.url);
const componentsDir = new URL("../components/", import.meta.url);

describe("business-live-events client helpers", () => {
  it("builds live-events URL with optional bearer token query", () => {
    assert.equal(buildBusinessLiveEventsUrl(7), "/api/businesses/7/live-events");
    assert.equal(
      buildBusinessLiveEventsUrl(7, "jwt"),
      "/api/businesses/7/live-events?token=jwt",
    );
  });

  it("backs off reconnect delays exponentially up to a cap", () => {
    assert.equal(sseReconnectDelayMs(1), 1_000);
    assert.equal(sseReconnectDelayMs(2), 2_000);
    assert.equal(sseReconnectDelayMs(6), 30_000);
    assert.ok(SSE_MAX_RECONNECT_ATTEMPTS >= 3);
  });

  it("maps disconnected state to connecting or polling for the indicator", () => {
    assert.equal(resolveLiveIndicatorStatus("disconnected", false), "connecting");
    assert.equal(resolveLiveIndicatorStatus("disconnected", true), "fallback");
    assert.equal(resolveLiveIndicatorStatus("live", true), "live");
  });
});

describe("business-live-event-stream parsing", () => {
  it("parses SSE frames and ignores comment heartbeats", () => {
    const chunk =
      ": keep-alive\n\nevent: order.created\ndata: {\"businessId\":1,\"orderId\":9,\"status\":\"NEW\",\"timestamp\":\"2026-07-06T12:00:00.000Z\"}\n\n";
    const { events, remainder } = parseSseBuffer(chunk);
    assert.equal(remainder, "");
    assert.equal(events.length, 1);
    const event = parseBusinessLiveEvent(events[0]!);
    assert.equal(event?.type, "order.created");
    assert.equal(event?.data.orderId, 9);
    assertLiveEventPayloadIsMinimal(event!.data);
  });
});

describe("business live events wiring", () => {
  it("provider keeps a single shared connection per business", async () => {
    const source = await readFile(
      new URL("business-live-events-provider.tsx", hooksDir),
      "utf8",
    );
    assert.match(source, /let sharedActiveConnection/);
    assert.match(source, /closeSharedConnection/);
    assert.match(source, /isBusinessHubLiveEventsRoute/);
    assert.match(source, /SSE_MAX_RECONNECT_ATTEMPTS/);
    assert.match(source, /status === "fallback"/);
  });

  it("live order and appointment alerts use polling only as fallback", async () => {
    const orderAlerts = await readFile(new URL("use-live-order-alerts.tsx", hooksDir), "utf8");
    const appointmentAlerts = await readFile(
      new URL("use-live-appointment-alerts.tsx", hooksDir),
      "utf8",
    );
    assert.match(orderAlerts, /usePollingFallback/);
    assert.match(orderAlerts, /registerOrderRefresh/);
    assert.match(appointmentAlerts, /usePollingFallback/);
    assert.match(appointmentAlerts, /registerAppointmentRefresh/);
    assert.match(orderAlerts, /if \(!businessId \|\| !usePollingFallback\) return/);
    assert.match(appointmentAlerts, /if \(!businessId \|\| !enabled \|\| usePollingFallback\) return/);
  });

  it("dashboard layout wraps BusinessLiveEventsProvider and shows status on live routes", async () => {
    const layout = await readFile(
      new URL("dashboard-layout.tsx", componentsDir),
      "utf8",
    );
    assert.match(layout, /BusinessLiveEventsProvider/);
    assert.match(layout, /useBusinessLiveEvents/);
    assert.match(layout, /BusinessLiveStatusIndicator/);
    assert.match(layout, /isBusinessHubLiveEventsRoute/);
  });
});
