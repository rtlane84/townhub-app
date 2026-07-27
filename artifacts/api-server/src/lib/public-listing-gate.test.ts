import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("public listing subscription gate", () => {
  it("requires feature-granting subscription on public directory and storefront routes", async () => {
    const source = await readFile(new URL("../routes/businesses.ts", import.meta.url), "utf8");

    assert.match(source, /mapBusinessesHavePublicListingAccess/);
    assert.match(source, /businessHasPublicListingAccess/);

    const directoryRoute = source.slice(
      source.indexOf('router.get("/businesses"'),
      source.indexOf('// POST /api/businesses/register'),
    );
    assert.match(directoryRoute, /listingAccessById\.get\(business\.id\) === true/);

    const slugRoute = source.slice(
      source.indexOf('router.get("/businesses/:slug"'),
      source.indexOf('// POST /api/businesses/manage'),
    );
    assert.match(slugRoute, /businessHasPublicListingAccess\(business\.id\)/);

    const checkoutRoute = source.slice(
      source.indexOf('router.get("/businesses/checkout/:businessId"'),
      source.indexOf('router.get("/businesses/:slug"'),
    );
    assert.match(checkoutRoute, /businessHasPublicListingAccess\(business\.id\)/);
  });
});

describe("application approval storefront default", () => {
  it("uses INFORMATION when approving onto a paid plan that requires checkout", async () => {
    const source = await readFile(new URL("../routes/applications.ts", import.meta.url), "utf8");
    const approve = source.slice(
      source.indexOf('router.post("/admin/applications/:id/approve"'),
      source.indexOf('router.post("/admin/applications/:id/reject"'),
    );
    assert.match(approve, /isComplimentaryPlan/);
    assert.match(approve, /paidRequiresCheckout/);
    assert.match(approve, /INFORMATION/);
    assert.match(approve, /initialStorefrontMode/);
    assert.match(approve, /invalidatePublicBusinessDirectoryCache/);
  });
});
