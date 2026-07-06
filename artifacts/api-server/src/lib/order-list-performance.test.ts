import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const routesDir = new URL("../routes/", import.meta.url);
const libDir = new URL("./", import.meta.url);

describe("order list performance wiring", () => {
  it("uses batched serialization for business, customer, and admin order lists", async () => {
    const source = await readFile(new URL("orders.ts", routesDir), "utf8");
    assert.match(source, /serializeOrdersBatch/);
    assert.doesNotMatch(source, /Promise\.all\([\s\S]*serializeOrderWithLoadedItems/);
    assert.ok((source.match(/serializeOrdersBatch/g) ?? []).length >= 3);
  });

  it("supports active kitchen filters on business order lists", async () => {
    const source = await readFile(new URL("orders.ts", routesDir), "utf8");
    assert.match(source, /parseBusinessOrderListQuery/);
    assert.match(source, /ACTIVE_KITCHEN_ORDER_STATUSES/);
    assert.match(source, /activeOnly/);
  });

  it("loads business order summary with SQL aggregates", async () => {
    const source = await readFile(new URL("orders.ts", routesDir), "utf8");
    assert.match(source, /loadBusinessOrderSummary/);
    const summarySource = await readFile(new URL("business-order-summary.ts", libDir), "utf8");
    assert.match(summarySource, /count\(\*\)::int/);
    assert.match(summarySource, /limit\(5\)/);
    assert.doesNotMatch(summarySource, /allOrders\.filter/);
  });
});

describe("kitchen polling deduplication wiring", () => {
  it("kitchen page reads the live-order scoped cache without its own refetch interval", async () => {
    const kitchen = await readFile(
      new URL("../../../local-order-hub/src/pages/dashboard/business/kitchen.tsx", import.meta.url),
      "utf8",
    );
    assert.match(kitchen, /getKitchenBusinessOrdersQueryKey/);
    assert.match(kitchen, /listKitchenBusinessOrders/);
    assert.doesNotMatch(kitchen, /refetchInterval/);
    assert.doesNotMatch(kitchen, /useListBusinessOrders/);
  });

  it("live order alerts poll the same scoped kitchen query key when SSE fallback is active", async () => {
    const alerts = await readFile(
      new URL("../../../local-order-hub/src/hooks/use-live-order-alerts.tsx", import.meta.url),
      "utf8",
    );
    assert.match(alerts, /getKitchenBusinessOrdersQueryKey/);
    assert.match(alerts, /fetchOwnerOrderDashboardData/);
    assert.match(alerts, /usePollingFallback/);
    assert.match(alerts, /registerOrderRefresh/);
    assert.doesNotMatch(alerts, /listBusinessOrders\(/);
  });
});
