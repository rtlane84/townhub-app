import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildApplicationApprovedEmail,
  defaultApplicationApprovedEmailData,
} from "./email-templates/application-emails";

describe("application approved emails", () => {
  it("prompts paid plans to complete subscription checkout", () => {
    const email = buildApplicationApprovedEmail(
      defaultApplicationApprovedEmailData({
        businessName: "Clay Diner",
        planName: "Pro",
        statusLabel: "Pending checkout",
        priceLabel: "$29.00/month",
        billingInterval: "monthly",
        requiresCheckout: true,
      }),
    );

    assert.match(email.subject, /Application approved/i);
    assert.match(email.subject, /complete your Pro subscription/i);
    assert.match(email.html, /Complete Subscription Setup/);
    assert.match(email.html, /Complete your subscription setup/);
    assert.match(email.html, /Watch Quick Start Video/);
    assert.match(email.html, /Business Owner Help Center/);
    assert.doesNotMatch(email.html, /Upload your logo/i);
    assert.doesNotMatch(email.html, /Add products/i);
    assert.match(email.html, /checkout/i);
  });

  it("welcomes complimentary trial plans with business hub CTA", () => {
    const email = buildApplicationApprovedEmail(
      defaultApplicationApprovedEmailData({
        businessName: "Clay Diner",
        planName: "Starter",
        statusLabel: "Trial",
        priceLabel: "Complimentary",
        billingInterval: "monthly",
        trialEndsAt: "2026-07-01T00:00:00Z",
        requiresCheckout: false,
      }),
    );

    assert.match(email.html, /Welcome to TownHub/);
    assert.match(email.html, /Open Business Hub/);
    assert.match(email.html, /Next Steps/);
    assert.match(email.html, /Watch the Business Owner Quick Start video/);
    assert.match(email.html, /Watch Quick Start Video/);
    assert.match(email.html, /Business Owner Help Center/);
    assert.doesNotMatch(email.html, /Complete your subscription setup/i);
    assert.doesNotMatch(email.html, /Upload your logo/i);
  });
});
