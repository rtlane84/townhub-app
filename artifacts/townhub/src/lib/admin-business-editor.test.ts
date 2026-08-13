import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const editorSource = readFileSync(
  join(packageRoot, "src/pages/dashboard/admin/businesses.tsx"),
  "utf8",
);

describe("admin business editor", () => {
  it("keeps platform controls in the admin dialog", () => {
    assert.match(editorSource, /Platform controls/);
    assert.match(editorSource, /Business active/);
    assert.match(editorSource, /Business featured/);
  });

  it("directs operational configuration to Business Hub", () => {
    assert.match(
      editorSource,
      /Store hours, ordering, fulfillment, and payments are managed in Business Hub settings\./,
    );
    assert.doesNotMatch(editorSource, /WeeklyHoursPicker/);
    assert.doesNotMatch(editorSource, /PaymentModeSelector/);
    assert.doesNotMatch(editorSource, /form\.pickupEnabled/);
  });

  it("does not resubmit operational settings from the admin editor", () => {
    const payloadSource = editorSource.slice(
      editorSource.indexOf("function buildPayload"),
      editorSource.indexOf("function handleSubmit"),
    );

    assert.doesNotMatch(payloadSource, /structuredHours/);
    assert.doesNotMatch(payloadSource, /pickupEnabled/);
    assert.doesNotMatch(payloadSource, /deliveryEnabled/);
    assert.doesNotMatch(payloadSource, /paymentMode/);
    assert.doesNotMatch(payloadSource, /deliveryFee/);
    assert.doesNotMatch(payloadSource, /minimumOrder/);
  });

  it("shows each business subscription and preselects it when changing plans", () => {
    assert.match(editorSource, /BusinessSubscriptionSummary businessId=\{biz\.id\}/);
    assert.match(editorSource, /Plan: \{subscription\.plan\?\.name/);
    assert.match(editorSource, /subscriptionStatusDisplayLabel\(subscription\)/);
    assert.match(editorSource, /formatBillingIntervalLabel\(subscription\.billingInterval\)/);
    assert.match(editorSource, /setSubPlanId\(String\(subscription\.planId\)\)/);
    assert.match(editorSource, /Loading current plan…/);
  });
});
