import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { attachLiveEventsBearerFromQuery } from "../lib/business-live-events.ts";

const routesDir = new URL("../routes/", import.meta.url);

describe("business-live-events route", () => {
  it("requires auth and owner/admin authorization", async () => {
    const source = await readFile(new URL("business-live-events.ts", routesDir), "utf8");
    assert.match(source, /requireAuth/);
    assert.match(source, /authorizeBusinessOwnerOrAdmin/);
    assert.match(source, /text\/event-stream/);
    assert.match(source, /subscribeBusinessLiveEvents\(businessId/);
    assert.match(source, /BUSINESS_LIVE_HEARTBEAT_INTERVAL_MS/);
    assert.match(source, /req\.on\("close"/);
  });

  it("is mounted before the businesses router", async () => {
    const indexSource = await readFile(new URL("index.ts", routesDir), "utf8");
    const liveIndex = indexSource.indexOf("businessLiveEventsRouter");
    const businessesIndex = indexSource.indexOf("businessesRouter");
    assert.ok(liveIndex >= 0);
    assert.ok(businessesIndex >= 0);
    assert.ok(liveIndex < businessesIndex);
  });

  it("publishes live events after order and appointment mutations", async () => {
    const ordersSource = await readFile(new URL("orders.ts", routesDir), "utf8");
    assert.match(ordersSource, /publishOrderCreatedLiveEvent/);
    assert.match(ordersSource, /publishOrderUpdatedLiveEvent/);

    const appointmentsSource = await readFile(
      new URL("appointment-requests.ts", routesDir),
      "utf8",
    );
    assert.match(appointmentsSource, /publishAppointmentCreatedLiveEvent/);
    assert.match(appointmentsSource, /publishAppointmentUpdatedLiveEvent/);
  });

  it("copies bearer token from query for EventSource clients", () => {
    const req = {
      query: { token: "clerk-jwt" },
      headers: {} as { authorization?: string },
    };

    attachLiveEventsBearerFromQuery(req);
    assert.equal(req.headers.authorization, "Bearer clerk-jwt");
  });

  it("does not override an existing Authorization header", () => {
    const req = {
      query: { token: "query-jwt" },
      headers: { authorization: "Bearer header-jwt" },
    };

    attachLiveEventsBearerFromQuery(req);
    assert.equal(req.headers.authorization, "Bearer header-jwt");
  });
});
