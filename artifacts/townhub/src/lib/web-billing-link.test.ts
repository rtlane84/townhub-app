import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getOwnerSubscriptionWebUrl,
  OWNER_SUBSCRIPTION_WEB_PATH,
} from "./web-billing-link.ts";

describe("getOwnerSubscriptionWebUrl", () => {
  it("appends the subscription path to an HTTPS base", () => {
    assert.equal(
      getOwnerSubscriptionWebUrl("https://townhaven.io"),
      `https://townhaven.io${OWNER_SUBSCRIPTION_WEB_PATH}`,
    );
  });

  it("strips trailing slashes from the base", () => {
    assert.equal(
      getOwnerSubscriptionWebUrl("https://staging.townhaven.io/"),
      `https://staging.townhaven.io${OWNER_SUBSCRIPTION_WEB_PATH}`,
    );
  });

  it("rejects non-HTTPS bases", () => {
    assert.throws(
      () => getOwnerSubscriptionWebUrl("http://townhaven.io"),
      /HTTPS/,
    );
    assert.throws(
      () => getOwnerSubscriptionWebUrl("capacitor://localhost"),
      /HTTPS/,
    );
  });
});
