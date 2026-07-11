import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNtfyPublishBody,
  resolveNtfyClickUrl,
} from "./ntfy-provider.ts";

describe("ntfy-provider", () => {
  it("builds JSON publish body with unicode titles", () => {
    const body = buildNtfyPublishBody({
      topic: "abcdefghijklmnopqrstuvwxyz1234567890ABCD",
      title: "New order",
      message: "Clay Diner\nTH-100\nPickup\n$24.50",
      click: "http://localhost:23032/dashboard/business/orders/9",
      tags: ["shopping_cart"],
    });

    assert.equal(body.title, "New order");
    assert.equal(body.topic, "abcdefghijklmnopqrstuvwxyz1234567890ABCD");
    assert.equal(body.click, undefined, "localhost click URLs should be omitted");
    assert.deepEqual(body.tags, ["shopping_cart"]);
  });

  it("keeps https click URLs", () => {
    const click = resolveNtfyClickUrl("https://townhub.test/dashboard/business/orders/9");
    assert.equal(click, "https://townhub.test/dashboard/business/orders/9");
    assert.equal(resolveNtfyClickUrl("http://localhost:23032/order/1"), undefined);
  });
});
