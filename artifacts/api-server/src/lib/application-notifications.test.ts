import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildApplicationApprovedEmail,
  buildApplicationRejectedEmail,
  buildApplicationSubmittedAdminEmail,
  defaultApplicationApprovedEmailData,
  defaultApplicationRejectedEmailData,
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

describe("application submitted admin emails", () => {
  it("includes review link and applicant details", () => {
    const email = buildApplicationSubmittedAdminEmail({
      applicationId: 42,
      businessName: "Clay Diner",
      businessTypeLabel: "Food Vendor",
      applicantEmail: "owner@example.com",
      planName: "Pro",
      billingInterval: "monthly",
      description: "Family restaurant on Main Street.",
      address: "123 Main St",
      phone: "(555) 555-0100",
      reviewApplicationsUrl: "https://townhub.example/dashboard/admin/applications",
    });

    assert.match(email.subject, /New business application/i);
    assert.match(email.subject, /Clay Diner/);
    assert.match(email.html, /Review application/);
    assert.match(email.html, /owner@example.com/);
    assert.match(email.html, /Food Vendor/);
    assert.match(email.text, /dashboard\/admin\/applications/);
  });
});

describe("application rejected owner emails", () => {
  it("includes the admin review note and reapply link", () => {
    const email = buildApplicationRejectedEmail(
      defaultApplicationRejectedEmailData({
        businessName: "Clay Diner",
        reviewNote: "We need a local phone number before approval.",
      }),
    );

    assert.match(email.subject, /Update on your TownHub application/i);
    assert.match(email.subject, /Clay Diner/);
    assert.match(email.html, /Not approved/);
    assert.match(email.html, /We need a local phone number before approval/);
    assert.match(email.html, /Submit a new application/);
    assert.match(email.text, /list-your-business/);
  });

  it("offers reapply guidance when no review note is provided", () => {
    const email = buildApplicationRejectedEmail(
      defaultApplicationRejectedEmailData({
        businessName: "Clay Diner",
        reviewNote: null,
      }),
    );

    assert.match(email.html, /submit a new application/i);
    assert.doesNotMatch(email.html, /Note from our team/);
  });
});
