import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeStripeConnectIssue,
  hubBannerCopyForConnectStatus,
  isUnresolvedStripeConnectIssue,
  shouldNotifyStripeConnectTransition,
} from "./stripe-critical-alerts.ts";

describe("stripe-critical-alerts", () => {
  it("treats restricted and pending-with-account as unresolved", () => {
    assert.equal(isUnresolvedStripeConnectIssue("restricted", "acct_1"), true);
    assert.equal(isUnresolvedStripeConnectIssue("pending", "acct_1"), true);
    assert.equal(isUnresolvedStripeConnectIssue("pending", null), false);
    assert.equal(isUnresolvedStripeConnectIssue("connected", "acct_1"), false);
    assert.equal(isUnresolvedStripeConnectIssue("not_connected", null), false);
  });

  it("notifies when entering a critical connect state", () => {
    assert.equal(shouldNotifyStripeConnectTransition("connected", "restricted", "acct_1"), true);
    assert.equal(shouldNotifyStripeConnectTransition("connected", "pending", "acct_1"), true);
    assert.equal(shouldNotifyStripeConnectTransition("connected", "not_connected", null), true);
    assert.equal(shouldNotifyStripeConnectTransition("restricted", "restricted", "acct_1"), false);
    assert.equal(shouldNotifyStripeConnectTransition("not_connected", "connected", "acct_1"), false);
  });

  it("describes disconnect and verification issues", () => {
    const disconnected = describeStripeConnectIssue({
      paymentStatus: "not_connected",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsCurrentlyDueCount: 0,
      connectedAccountId: null,
      previousStatus: "connected",
    });
    assert.equal(disconnected?.kind, "account_disconnected");

    const verification = describeStripeConnectIssue({
      paymentStatus: "pending",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsCurrentlyDueCount: 2,
      connectedAccountId: "acct_1",
    });
    assert.equal(verification?.kind, "verification_required");
  });

  it("provides hub banner copy for unresolved statuses", () => {
    assert.ok(hubBannerCopyForConnectStatus("restricted"));
    assert.ok(hubBannerCopyForConnectStatus("pending"));
    assert.equal(hubBannerCopyForConnectStatus("connected"), null);
  });
});
