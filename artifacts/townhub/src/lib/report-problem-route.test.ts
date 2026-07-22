import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCustomerFacingReportRoute } from "./report-problem-route.ts";

describe("isCustomerFacingReportRoute", () => {
  it("allows customer marketplace routes", () => {
    assert.equal(isCustomerFacingReportRoute("/"), true);
    assert.equal(isCustomerFacingReportRoute("/businesses"), true);
    assert.equal(isCustomerFacingReportRoute("/businesses/cafe"), true);
    assert.equal(isCustomerFacingReportRoute("/events"), true);
    assert.equal(isCustomerFacingReportRoute("/food-trucks"), true);
    assert.equal(isCustomerFacingReportRoute("/cart"), true);
    assert.equal(isCustomerFacingReportRoute("/my-orders"), true);
    assert.equal(isCustomerFacingReportRoute("/my-orders/12"), true);
    assert.equal(isCustomerFacingReportRoute("/order/12"), true);
    assert.equal(isCustomerFacingReportRoute("/account"), true);
    assert.equal(isCustomerFacingReportRoute("/help"), true);
    assert.equal(isCustomerFacingReportRoute("/help?tab=faq"), true);
  });

  it("hides owner, admin, checkout return, and marketing/auth routes", () => {
    assert.equal(isCustomerFacingReportRoute("/dashboard/business"), false);
    assert.equal(isCustomerFacingReportRoute("/dashboard/business/kitchen"), false);
    assert.equal(isCustomerFacingReportRoute("/dashboard/admin"), false);
    assert.equal(isCustomerFacingReportRoute("/checkout/return/abc"), false);
    assert.equal(isCustomerFacingReportRoute("/for-businesses"), false);
    assert.equal(isCustomerFacingReportRoute("/list-your-business"), false);
    assert.equal(isCustomerFacingReportRoute("/app"), false);
    assert.equal(isCustomerFacingReportRoute("/pricing"), false);
    assert.equal(isCustomerFacingReportRoute("/privacy-policy"), false);
    assert.equal(isCustomerFacingReportRoute("/terms-of-service"), false);
    assert.equal(isCustomerFacingReportRoute("/sign-in"), false);
    assert.equal(isCustomerFacingReportRoute("/sign-up"), false);
  });
});
