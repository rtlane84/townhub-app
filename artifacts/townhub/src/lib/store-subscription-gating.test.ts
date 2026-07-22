import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const subscriptionPage = readFileSync(
  `${root}/pages/dashboard/business/subscription.tsx`,
  "utf8",
);
const plansSection = readFileSync(`${root}/components/business-plans-section.tsx`, "utf8");
const applicationPage = readFileSync(`${root}/pages/list-your-business.tsx`, "utf8");
const capacitorShell = readFileSync(`${root}/lib/capacitor-shell.ts`, "utf8");

describe("store subscription gating", () => {
  it("prevents store builds from opening owner checkout or billing portal UI", () => {
    assert.match(subscriptionPage, /storeDistribution \|\| params\.get\("open"\) !== "billing"/);
    assert.match(subscriptionPage, /!storeDistribution && needsCheckout/);
    assert.match(subscriptionPage, /!storeDistribution && !needsCheckout/);
    assert.match(subscriptionPage, /!storeDistribution && business\?\.id && canChangePlan/);
  });

  it("offers a web billing CTA instead of in-app Stripe actions in store builds", () => {
    assert.match(subscriptionPage, /Manage on the web/);
    assert.match(subscriptionPage, /handleOpenWebBilling/);
    assert.match(subscriptionPage, /openExternalHttpsUrl/);
    assert.match(subscriptionPage, /getOwnerSubscriptionWebUrl/);
    assert.match(subscriptionPage, /getPublicWebBaseUrl/);
    assert.match(capacitorShell, /export function openExternalHttpsUrl/);
  });

  it("uses approval-email setup language in store builds", () => {
    assert.match(plansSection, /Approved owners receive subscription setup instructions by email/);
    assert.match(applicationPage, /setup instructions sent to your account email/);
    assert.match(subscriptionPage, /setup instructions sent to your account email/);
  });
});
