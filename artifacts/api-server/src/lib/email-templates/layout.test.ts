import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderEmailLayout } from "./layout";

describe("email layout", () => {
  it("contains business logos without cropping or stretching them", () => {
    const html = renderEmailLayout({
      businessName: "Duck Donuts",
      businessLogoUrl: "https://cdn.example.com/duck-donuts.png",
      heading: "Thanks for your order!",
      bodyHtml: "<p>Order complete.</p>",
    });

    assert.match(html, /width:auto;height:auto;max-width:64px;max-height:64px/);
    assert.doesNotMatch(html, /object-fit:cover/);
    assert.match(html, /alt="Duck Donuts"/);
  });
});
