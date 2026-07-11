import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNativeCheckoutReturnHtml } from "./native-checkout-return-html";

describe("buildNativeCheckoutReturnHtml", () => {
  it("embeds the frontend origin and pending-checkout deep link path", () => {
    const html = buildNativeCheckoutReturnHtml("https://townhub-app.example");
    assert.match(html, /webOrigin = 'https:\/\/townhub-app\.example'/);
    assert.match(html, /townhub:\/\/checkout\/return\//);
    assert.match(html, /\/checkout\/return\//);
  });
});
