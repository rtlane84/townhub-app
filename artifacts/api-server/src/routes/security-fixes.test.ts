import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const routesDir = new URL("./", import.meta.url);

describe("catalog mutation route auth wiring", () => {
  it("protects product and category mutations with requireBusinessCatalogAccess", async () => {
    const source = await readFile(new URL("products.ts", routesDir), "utf8");
    assert.match(source, /requireBusinessCatalogAccess/);
    assert.ok((source.match(/requireBusinessCatalogAccess/g) ?? []).length >= 6);
  });

  it("protects modifier group mutations with requireBusinessCatalogAccess", async () => {
    const source = await readFile(new URL("modifier-groups.ts", routesDir), "utf8");
    assert.match(source, /requireBusinessCatalogAccess/);
    assert.ok((source.match(/requireBusinessCatalogAccess/g) ?? []).length >= 3);
  });
});

describe("events mutation route auth wiring", () => {
  it("requires admin for event mutations", async () => {
    const source = await readFile(new URL("events.ts", routesDir), "utf8");
    assert.match(source, /router\.post\("\/events", requireAdmin/);
    assert.match(source, /router\.put\("\/events\/:id", requireAdmin/);
    assert.match(source, /router\.delete\("\/events\/:id", requireAdmin/);
  });
});

describe("business register route auth wiring", () => {
  it("requires admin for direct business registration", async () => {
    const source = await readFile(new URL("businesses.ts", routesDir), "utf8");
    assert.match(source, /router\.post\("\/businesses\/register", requireAdmin/);
  });
});

describe("order and commerce guard wiring", () => {
  it("enforces guest tokens, inactive business checks, and feature gates in orders", async () => {
    const source = await readFile(new URL("orders.ts", routesDir), "utf8");
    assert.match(source, /createOrderAccessToken/);
    assert.match(source, /authorizeOrderAccess/);
    assert.match(source, /isBusinessOpenForPublicCommerce/);
    assert.match(source, /requireOnlineOrderingFeature/);
  });

  it("enforces appointment feature gates", async () => {
    const source = await readFile(
      new URL("appointment-requests.ts", routesDir),
      "utf8",
    );
    assert.match(source, /requireAppointmentRequestsFeature/);
    assert.match(source, /isBusinessOpenForPublicCommerce/);
  });
});

describe("debug route production guard", () => {
  it("only mounts debug routes outside production", async () => {
    const source = await readFile(new URL("index.ts", routesDir), "utf8");
    assert.match(source, /NODE_ENV !== "production"/);
    assert.doesNotMatch(source, /router\.use\(debugRouter\);\nrouter\.use\(businessesRouter\)/);
  });
});

describe("food truck mutation route auth wiring", () => {
  it("protects food truck mutations with authorizeBusinessOwnerOrAdmin", async () => {
    const source = await readFile(new URL("food-truck.ts", routesDir), "utf8");
    assert.match(source, /authorizeBusinessOwnerOrAdmin/);
    assert.match(source, /authorizeFoodTruckLocationMutation/);
    assert.ok((source.match(/authorizeBusinessOwnerOrAdmin/g) ?? []).length >= 3);
    assert.ok((source.match(/authorizeFoodTruckLocationMutation/g) ?? []).length >= 3);
  });
});
