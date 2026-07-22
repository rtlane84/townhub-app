import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getOwnerSubscriptionWebUrl,
  OWNER_SUBSCRIPTION_WEB_PATH,
} from "./web-billing-link.ts";

describe("getOwnerSubscriptionWebUrl", () => {
  it("appends the subscription path to an HTTPS base", () => {
    assert.equal(
      getOwnerSubscriptionWebUrl("https://townhub.io"),
      `https://townhub.io${OWNER_SUBSCRIPTION_WEB_PATH}`,
    );
  });

  it("strips trailing slashes from the base", () => {
    assert.equal(
      getOwnerSubscriptionWebUrl("https://staging.townhub.io/"),
      `https://staging.townhub.io${OWNER_SUBSCRIPTION_WEB_PATH}`,
    );
  });

  it("rejects non-HTTPS bases", () => {
    assert.throws(
      () => getOwnerSubscriptionWebUrl("http://townhub.io"),
      /HTTPS/,
    );
    assert.throws(
      () => getOwnerSubscriptionWebUrl("capacitor://localhost"),
      /HTTPS/,
    );
  });
});
