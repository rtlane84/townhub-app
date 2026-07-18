import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLERK_USER_DESYNC_PUBLIC_RESPONSE } from "./clerk-user-desync-public";

describe("Clerk user desync public response", () => {
  it("contains only a generic support-safe error", () => {
    assert.deepEqual(Object.keys(CLERK_USER_DESYNC_PUBLIC_RESPONSE), ["error"]);
    assert.doesNotMatch(
      CLERK_USER_DESYNC_PUBLIC_RESPONSE.error,
      /user_|email|relink|command|pnpm|clerk user id/i,
    );
  });
});
