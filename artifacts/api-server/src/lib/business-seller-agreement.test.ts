import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUSINESS_SELLER_AGREEMENT_VERSION,
  isBusinessSellerAgreementApprovedForProduction,
} from "./business-seller-agreement";

describe("business seller agreement launch gate", () => {
  it("allows development and test submissions without a production approval setting", () => {
    assert.equal(isBusinessSellerAgreementApprovedForProduction("development"), true);
    assert.equal(isBusinessSellerAgreementApprovedForProduction("test"), true);
  });

  it("blocks production submissions until the exact published version is approved", () => {
    assert.equal(isBusinessSellerAgreementApprovedForProduction("production"), false);
    assert.equal(isBusinessSellerAgreementApprovedForProduction("production", "outdated"), false);
    assert.equal(
      isBusinessSellerAgreementApprovedForProduction("production", BUSINESS_SELLER_AGREEMENT_VERSION),
      true,
    );
  });
});
