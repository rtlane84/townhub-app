import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { UpdateBusinessBody } from "@workspace/api-zod";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const apiServerRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("orderClosingBufferMinutes regression", () => {
  it("settings keep buffer in form state when availability mode changes", () => {
    const settings = readFileSync(
      join(root, "artifacts/townhub/src/pages/dashboard/business/settings.tsx"),
      "utf8",
    );
    const modeChange = settings.match(
      /onValueChange=\{\(orderingAvailabilityMode\) =>\s*setForm\(\(f\) => \(\{([\s\S]*?)\}\)\)\s*\}/,
    );
    assert.ok(modeChange);
    assert.match(modeChange![1], /orderingAvailabilityMode:/);
    assert.doesNotMatch(modeChange![1], /orderClosingBufferMinutes/);
    assert.match(settings, /resolveOrderClosingBufferMinutes/);
    assert.match(
      settings,
      /orderingAvailabilityMode === "BUSINESS_HOURS" \|\|[\s\S]*MOBILE_LOCATION_SCHEDULE/,
    );
  });

  it("API update/create coerce through resolveOrderClosingBufferMinutes", () => {
    const businesses = readFileSync(
      join(apiServerRoot, "src/routes/businesses.ts"),
      "utf8",
    );
    assert.match(businesses, /resolveOrderClosingBufferMinutes/);
    assert.match(businesses, /orderClosingBufferMinutes: resolveOrderClosingBufferMinutes/);
    assert.match(businesses, /orderClosingBufferMinutes: b\.orderClosingBufferMinutes \?\? 0/);
  });

  it("UpdateBusinessBody accepts 0–240 and rejects out of range", () => {
    assert.equal(UpdateBusinessBody.safeParse({ orderClosingBufferMinutes: 0 }).success, true);
    assert.equal(UpdateBusinessBody.safeParse({ orderClosingBufferMinutes: 1 }).success, true);
    assert.equal(UpdateBusinessBody.safeParse({ orderClosingBufferMinutes: 30 }).success, true);
    assert.equal(UpdateBusinessBody.safeParse({ orderClosingBufferMinutes: 240 }).success, true);
    assert.equal(UpdateBusinessBody.safeParse({ orderClosingBufferMinutes: -1 }).success, false);
    assert.equal(UpdateBusinessBody.safeParse({ orderClosingBufferMinutes: 241 }).success, false);
    assert.equal(UpdateBusinessBody.safeParse({ orderClosingBufferMinutes: null }).success, false);
  });

  it("orders and checkout intents share the same availability evaluator call pattern", () => {
    const orders = readFileSync(join(apiServerRoot, "src/routes/orders.ts"), "utf8");
    const matches = [
      ...orders.matchAll(
        /evaluateBusinessOrderingAvailability\(business, \{ mobileLocations \}\)/g,
      ),
    ];
    assert.equal(matches.length, 2);

    const createIdx = orders.indexOf('router.post("/orders"');
    const intentsIdx = orders.indexOf('router.post("/checkout/intents"');
    assert.ok(createIdx > 0 && intentsIdx > createIdx);

    const createCall = orders.indexOf(
      "evaluateBusinessOrderingAvailability(business, { mobileLocations })",
      createIdx,
    );
    const intentsCall = orders.indexOf(
      "evaluateBusinessOrderingAvailability(business, { mobileLocations })",
      intentsIdx,
    );
    assert.ok(createCall > createIdx && createCall < intentsIdx);
    assert.ok(intentsCall > intentsIdx);

    // Availability gate is not branched on pickup vs delivery.
    const aroundCreate = orders.slice(createCall - 200, createCall + 200);
    const aroundIntents = orders.slice(intentsCall - 200, intentsCall + 200);
    assert.doesNotMatch(aroundCreate, /fulfillmentType === .*(PICKUP|DELIVERY).*evaluateBusinessOrderingAvailability/);
    assert.doesNotMatch(aroundIntents, /fulfillmentType === .*(PICKUP|DELIVERY).*evaluateBusinessOrderingAvailability/);
  });

  it("storefront/checkout serialize orderingAvailable from the same evaluator", () => {
    const businesses = readFileSync(
      join(apiServerRoot, "src/routes/businesses.ts"),
      "utf8",
    );
    assert.match(
      businesses,
      /const availability = evaluateBusinessOrderingAvailability\(b, \{[\s\S]*mobileLocations/,
    );
    assert.match(businesses, /orderingAvailable: availability\.available/);
    assert.match(businesses, /orderClosingBufferMinutes: b\.orderClosingBufferMinutes \?\? 0/);
  });

  it("bootstrap SQL is idempotent with DEFAULT 0", () => {
    const ensure = readFileSync(
      join(apiServerRoot, "src/lib/ensure-business-fulfillment-schema.ts"),
      "utf8",
    );
    const index = readFileSync(join(apiServerRoot, "src/index.ts"), "utf8");
    assert.match(
      ensure,
      /ADD COLUMN IF NOT EXISTS order_closing_buffer_minutes integer NOT NULL DEFAULT 0/,
    );
    assert.match(index, /ensureOrderClosingBufferMinutesColumn/);
  });

  it("customer surfaces no longer reference orderCutoffTime", () => {
    const storefront = readFileSync(
      join(root, "artifacts/townhub/src/pages/storefront.tsx"),
      "utf8",
    );
    const cart = readFileSync(join(root, "artifacts/townhub/src/pages/cart.tsx"), "utf8");
    const settings = readFileSync(
      join(root, "artifacts/townhub/src/pages/dashboard/business/settings.tsx"),
      "utf8",
    );
    assert.doesNotMatch(storefront, /orderCutoffTime/);
    assert.doesNotMatch(cart, /orderCutoffTime/);
    assert.doesNotMatch(settings, /orderCutoffTime/);
  });

  it("OpenAPI and generated UpdateBusinessBody stay aligned on 0–240", () => {
    const openapi = readFileSync(join(root, "lib/api-spec/openapi.yaml"), "utf8");
    const generated = readFileSync(
      join(root, "lib/api-zod/src/generated/api.ts"),
      "utf8",
    );
    assert.match(
      openapi,
      /orderClosingBufferMinutes:\n\s+type: integer\n\s+minimum: 0\n\s+maximum: 240/,
    );
    assert.match(generated, /updateBusinessBodyOrderClosingBufferMinutesMin = 0/);
    assert.match(generated, /updateBusinessBodyOrderClosingBufferMinutesMax = 240/);
    assert.match(
      generated,
      /"orderClosingBufferMinutes": zod\.number\(\)\.min\(updateBusinessBodyOrderClosingBufferMinutesMin\)\.max\(updateBusinessBodyOrderClosingBufferMinutesMax\)/,
    );
  });
});
