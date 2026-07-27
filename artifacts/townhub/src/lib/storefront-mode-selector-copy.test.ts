import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const selectorSource = readFileSync(
  join(packageRoot, "src/components/storefront-mode-selector.tsx"),
  "utf8",
);
const settingsSource = readFileSync(
  join(packageRoot, "src/pages/dashboard/business/settings.tsx"),
  "utf8",
);

describe("storefront mode selector copy", () => {
  it("uses public-page wording when catalog is not allowed", () => {
    assert.match(selectorSource, /catalogAllowed\?: boolean/);
    assert.match(
      selectorSource,
      /Show your public page with hours, photos, and contact info\. No menu, catalog, cart, or checkout\./,
    );
  });

  it("passes catalogAllowed from business_website entitlement", () => {
    assert.match(settingsSource, /catalogAllowed=\{businessWebsiteAllowed\}/);
  });

  it("stops suggesting online ordering when the plan locks it", () => {
    assert.match(settingsSource, /!\s*isOrderingMode && onlineOrderingAllowed/);
    assert.doesNotMatch(settingsSource, /!\s*isOrderingMode && !orderingLockedOnPlan/);
  });
});
