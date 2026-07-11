import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertProductAvailableForOrder,
  PRODUCT_UNAVAILABLE_CODE,
  productUnavailableOrderMessage,
} from "./product-availability.ts";

const here = dirname(fileURLToPath(import.meta.url));
const apiServerRoot = join(here, "../..");
const root = join(here, "../../../..");

describe("product availability Phase 1", () => {
  it("defaults available products to orderable", () => {
    assert.deepEqual(assertProductAvailableForOrder({ name: "Burger", available: true }), {
      ok: true,
    });
    assert.deepEqual(assertProductAvailableForOrder({ name: "Burger" }), { ok: true });
    assert.deepEqual(assertProductAvailableForOrder({ name: "Burger", available: null }), {
      ok: true,
    });
  });

  it("rejects unavailable products with a typed error", () => {
    const result = assertProductAvailableForOrder({ name: "Soup", available: false });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, PRODUCT_UNAVAILABLE_CODE);
      assert.equal(result.error, productUnavailableOrderMessage("Soup"));
    }
  });

  it("enforces availability on order create and checkout intents", () => {
    const orders = readFileSync(join(apiServerRoot, "src/routes/orders.ts"), "utf8");
    assert.match(orders, /assertProductAvailableForOrder/);
    assert.equal((orders.match(/assertProductAvailableForOrder\(product\)/g) ?? []).length, 2);
    assert.match(orders, /code: availabilityCheck\.code/);
  });

  it("storefront and public catalog include unavailable products", () => {
    const businesses = readFileSync(join(apiServerRoot, "src/routes/businesses.ts"), "utf8");
    const products = readFileSync(join(apiServerRoot, "src/routes/products.ts"), "utf8");
    assert.doesNotMatch(
      businesses,
      /eq\(productsTable\.businessId, business\.id\),\s*eq\(productsTable\.available, true\)/,
    );
    assert.match(
      products,
      /Public callers receive available and unavailable items/,
    );
    assert.doesNotMatch(
      products,
      /else \{\s*conditions\.push\(eq\(productsTable\.available, true\)\);/,
    );
  });

  it("create defaults available true and patch preserves unless provided", () => {
    const products = readFileSync(join(apiServerRoot, "src/routes/products.ts"), "utf8");
    assert.match(products, /available: parsed\.data\.available \?\? true/);
    assert.match(products, /if \(d\.available !== undefined\) updateData\.available = d\.available/);
  });

  it("schema defaults available to true", () => {
    const schema = readFileSync(join(root, "lib/db/src/schema/products.ts"), "utf8");
    assert.match(schema, /available: boolean\("available"\)\.notNull\(\)\.default\(true\)/);
  });
});
