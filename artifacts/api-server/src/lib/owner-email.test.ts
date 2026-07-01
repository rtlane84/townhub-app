import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emailFromSessionClaims, isDeliverableEmail } from "./owner-email-core.ts";

describe("owner-email", () => {
  it("rejects synthetic clerk placeholder emails", () => {
    assert.equal(isDeliverableEmail("user_abc@user.local"), false);
    assert.equal(isDeliverableEmail("owner@example.com"), true);
  });

  it("reads email from common Clerk session claim shapes", () => {
    assert.equal(emailFromSessionClaims({ email: "owner@example.com" }), "owner@example.com");
    assert.equal(
      emailFromSessionClaims({ primary_email_address: "owner@example.com" }),
      "owner@example.com",
    );
    assert.equal(emailFromSessionClaims({ email: "user_abc@user.local" }), null);
    assert.equal(
      emailFromSessionClaims({ emails: [{ email_address: "owner@example.com" }] }),
      "owner@example.com",
    );
  });
});
