import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("storefront URL owner UX", () => {
  it("explains stable URLs on the apply flow", () => {
    const applyPage = readFileSync(
      join(root, "artifacts/local-order-hub/src/pages/list-your-business.tsx"),
      "utf8",
    );
    assert.match(applyPage, /Storefront URL/);
    assert.match(applyPage, /STOREFRONT_URL_APPLY_HELP/);
    assert.match(applyPage, /STOREFRONT_URL_SUPPORT_NOTE/);
    assert.match(applyPage, /slug-availability/);
    assert.doesNotMatch(applyPage, /permalink/i);
    assert.doesNotMatch(applyPage, /Your slug/i);
    assert.doesNotMatch(applyPage, />Slug</);
  });

  it("shows a copyable storefront URL in business settings", () => {
    const settings = readFileSync(
      join(root, "artifacts/local-order-hub/src/pages/dashboard/business/settings.tsx"),
      "utf8",
    );
    const field = readFileSync(
      join(root, "artifacts/local-order-hub/src/components/storefront-url-field.tsx"),
      "utf8",
    );
    assert.match(settings, /StorefrontUrlField/);
    assert.match(field, /Copy Link/);
    assert.match(field, /public web address/);
    assert.match(field, /don't have to update links you've already shared/);
    assert.match(field, /Need to change your storefront link\? Contact TownHub support and we'll be happy to help\./);
  });
});

describe("storefront URL availability API contract", () => {
  it("documents the public availability endpoint", () => {
    const openapi = readFileSync(join(root, "lib/api-spec/openapi.yaml"), "utf8");
    assert.match(openapi, /\/businesses\/slug-availability:/);
    assert.match(openapi, /BusinessSlugAvailability/);
    assert.match(openapi, /suggestedSlug/);
  });
});
