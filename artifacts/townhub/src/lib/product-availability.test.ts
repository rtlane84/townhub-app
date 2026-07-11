import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { cartItemUnavailableMessage } from "./product-availability-copy.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("product availability UX Phase 1", () => {
  it("uses Sold out for customers and Unavailable for owners", () => {
    const storefront = readFileSync(
      join(packageRoot, "src/pages/storefront.tsx"),
      "utf8",
    );
    const products = readFileSync(
      join(packageRoot, "src/pages/dashboard/business/products.tsx"),
      "utf8",
    );
    assert.match(storefront, /Sold out/);
    assert.doesNotMatch(storefront, /Out of stock/);
    assert.match(products, /Available for ordering/);
    assert.match(
      products,
      /Turn this off when the item is temporarily sold out or unavailable\./,
    );
    assert.match(products, /switch-product-available-\$\{product\.id\}/);
    assert.match(products, /setProductAvailable/);
  });

  it("cart blocks checkout and prompts removal without silent delete", () => {
    const cart = readFileSync(join(packageRoot, "src/pages/cart.tsx"), "utf8");
    const context = readFileSync(
      join(packageRoot, "src/components/cart-context.tsx"),
      "utf8",
    );
    assert.equal(
      cartItemUnavailableMessage("Tacos"),
      "Tacos is no longer available. Remove it from your cart to continue.",
    );
    assert.match(cart, /hasUnavailableCartItems/);
    assert.match(cart, /Remove unavailable items to continue checkout/);
    assert.match(cart, /disabled=\{itemUnavailable\}/);
    assert.doesNotMatch(cart, /removeFromCart\(.*unavailable/);
    assert.match(context, /product\.available === false/);
  });

  it("quick toggle uses optimistic update with rollback on error", () => {
    const products = readFileSync(
      join(packageRoot, "src/pages/dashboard/business/products.tsx"),
      "utf8",
    );
    assert.match(products, /setQueryData/);
    assert.match(products, /Couldn't update availability/);
    assert.match(products, /togglingAvailabilityId === productId/);
  });
});
