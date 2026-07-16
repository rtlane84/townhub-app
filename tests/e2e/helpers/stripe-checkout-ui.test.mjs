import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const helper = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "stripe-checkout.ts"),
  "utf8",
);

describe("stripe checkout E2E helper", () => {
  it("selects Accordion Card before filling iframes", () => {
    assert.match(helper, /getByRole\("listitem"\)/);
    assert.match(helper, /card-accordion-item-button/);
    assert.match(helper, /cardholder name|name on card/i);
    assert.match(helper, /getByRole\("button", \{ name: \/\^pay\$\/i \}\)/);
  });
});
