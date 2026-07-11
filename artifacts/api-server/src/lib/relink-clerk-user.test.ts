import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickHigherRole,
  isDevClerkRelinkAllowed,
  formatRelinkDiagnosis,
  isSyntheticClerkEmail,
} from "./relink-clerk-user-shared";

describe("relink-clerk-user helpers", () => {
  it("isDevClerkRelinkAllowed is false in production", () => {
    assert.equal(isDevClerkRelinkAllowed("production"), false);
    assert.equal(isDevClerkRelinkAllowed("development"), true);
  });

  it("pickHigherRole prefers ADMIN over BUSINESS_OWNER and CUSTOMER", () => {
    assert.equal(pickHigherRole("ADMIN", "CUSTOMER"), "ADMIN");
    assert.equal(pickHigherRole("BUSINESS_OWNER", "CUSTOMER"), "BUSINESS_OWNER");
    assert.equal(pickHigherRole("CUSTOMER", "ADMIN"), "ADMIN");
  });

  it("isSyntheticClerkEmail detects placeholder addresses", () => {
    assert.equal(isSyntheticClerkEmail("user_abc@user.local"), true);
    assert.equal(isSyntheticClerkEmail("admin@town.com"), false);
  });

  it("formatRelinkDiagnosis highlights mismatch", () => {
    const text = formatRelinkDiagnosis({
      devRepairAllowed: true,
      email: "owner@example.com",
      emailLooksSynthetic: false,
      currentClerkUserId: "user_new",
      userMatchedByClerkId: {
        id: "user_new",
        email: "user_new@user.local",
        role: "CUSTOMER",
      },
      userMatchedByEmail: {
        id: "user_old",
        email: "owner@example.com",
        role: "ADMIN",
      },
      clerkIdMismatch: true,
      businessesForClerkUser: [],
      businessesForEmailUser: [{ id: 1, name: "Demo Shop", slug: "demo-shop" }],
      recommendation: "Run relink.",
    });

    assert.match(text, /Clerk ID mismatch: YES/);
    assert.match(text, /user_old/);
    assert.match(text, /Demo Shop/);
  });
});
