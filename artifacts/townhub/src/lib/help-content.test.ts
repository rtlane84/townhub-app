import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  customerHelp,
  featuredVideos,
  filterHelpDirectory,
  platformSupportContact,
  resolveBusinessOwnerHelpForDistribution,
  type HelpDirectory,
} from "./help-content.ts";
import { parseYouTubeId, parseVimeoId, resolveVideoEmbed } from "./help-video.ts";

function allGuideIds(directory: HelpDirectory): string[] {
  return directory.categories.flatMap((category) => category.guides.map((guide) => guide.id));
}

function allInternalLinks(directory: HelpDirectory): string[] {
  return directory.categories.flatMap((category) =>
    category.guides.flatMap((guide) => guide.link?.href ?? []),
  );
}

describe("help-content", () => {
  it("keeps video placeholders configured but unpublished", () => {
    assert.deepEqual(
      featuredVideos.map((video) => video.id),
      ["welcome", "customer-training", "owner-training"],
    );
    assert.ok(featuredVideos.every((video) => !video.video));
  });

  it("uses unique category, guide, FAQ, and video ids", () => {
    const ownerHelp = resolveBusinessOwnerHelpForDistribution(false);
    const ids = [
      ...featuredVideos.map((video) => `video:${video.id}`),
      ...customerHelp.categories.map((category) => `category:${category.id}`),
      ...ownerHelp.categories.map((category) => `category:${category.id}`),
      ...allGuideIds(customerHelp).map((id) => `guide:${id}`),
      ...allGuideIds(ownerHelp).map((id) => `guide:${id}`),
      ...customerHelp.faqs.map((faq) => `faq:${faq.id}`),
      ...ownerHelp.faqs.map((faq) => `faq:${faq.id}`),
    ];

    assert.equal(new Set(ids).size, ids.length);
  });

  it("covers the complete customer journey", () => {
    const categoryIds = customerHelp.categories.map((category) => category.id);
    assert.deepEqual(categoryIds, [
      "discover",
      "shop-order",
      "checkout-payment",
      "after-order",
      "appointments",
      "account-support",
    ]);

    const guideIds = allGuideIds(customerHelp);
    for (const required of [
      "browse-businesses",
      "manage-cart",
      "pickup-delivery",
      "guest-or-account",
      "payment-methods",
      "checkout-problems",
      "confirmation-tracking",
      "order-statuses",
      "changes-cancellations-refunds",
      "request-appointment",
      "account-settings",
    ]) {
      assert.ok(guideIds.includes(required), `missing customer guide ${required}`);
    }
  });

  it("covers owner setup and daily operations in journey order", () => {
    const ownerHelp = resolveBusinessOwnerHelpForDistribution(false);
    const guideIds = allGuideIds(ownerHelp);
    for (const required of [
      "owner-application",
      "owner-approval",
      "owner-storefront-mode",
      "owner-categories-items",
      "owner-item-options",
      "owner-fulfillment",
      "owner-stripe-connect",
      "owner-subscription",
      "owner-order-queue",
      "owner-order-statuses",
      "owner-kitchen",
      "owner-cancel-refund",
      "owner-appointment-requests",
      "owner-notification-channels",
      "owner-live-status",
      "owner-mobile-schedule",
      "owner-daily-checklist",
    ]) {
      assert.ok(guideIds.includes(required), `missing owner guide ${required}`);
    }

    const steps = ownerHelp.categories.flatMap((category) =>
      category.guides.map((guide) => guide.journeyStep),
    );
    assert.ok(steps.every((step): step is number => step != null));
    assert.deepEqual(steps, Array.from({ length: steps.length }, (_, index) => index + 1));
  });

  it("uses only application routes for guide action links", () => {
    const validPaths = new Set([
      "/account",
      "/businesses",
      "/cart",
      "/dashboard/business",
      "/dashboard/business/appointments",
      "/dashboard/business/kitchen",
      "/dashboard/business/locations",
      "/dashboard/business/notifications",
      "/dashboard/business/orders",
      "/dashboard/business/product-options",
      "/dashboard/business/products",
      "/dashboard/business/settings",
      "/dashboard/business/subscription",
      "/food-trucks",
      "/list-your-business",
      "/my-orders",
    ]);
    const links = [
      ...allInternalLinks(customerHelp),
      ...allInternalLinks(resolveBusinessOwnerHelpForDistribution(false)),
    ];

    for (const href of links) {
      assert.ok(validPaths.has(href.split("#")[0] ?? href), `unknown Help link ${href}`);
    }
  });

  it("filters titles, instructions, keywords, and FAQs within one directory", () => {
    const titleResult = filterHelpDirectory(customerHelp, "manage your cart");
    assert.deepEqual(allGuideIds(titleResult), ["manage-cart"]);

    const instructionResult = filterHelpDirectory(customerHelp, "estimated preparation");
    assert.deepEqual(allGuideIds(instructionResult), ["pickup-delivery"]);

    const keywordResult = filterHelpDirectory(customerHelp, "modifier");
    assert.deepEqual(allGuideIds(keywordResult), ["browse-items-options"]);

    const faqResult = filterHelpDirectory(customerHelp, "two businesses");
    assert.equal(faqResult.guideCount, 0);
    assert.deepEqual(faqResult.faqs.map((faq) => faq.id), ["multiple-business-cart"]);
  });

  it("keeps customer and owner search results isolated", () => {
    const customerResults = filterHelpDirectory(customerHelp, "Stripe Connect");
    const ownerResults = filterHelpDirectory(
      resolveBusinessOwnerHelpForDistribution(false),
      "Stripe Connect",
    );

    assert.equal(customerResults.guideCount, 0);
    assert.ok(allGuideIds(ownerResults).includes("owner-stripe-connect"));
  });

  it("removes in-app subscription purchase actions from store-distribution help", () => {
    const storeHelp = resolveBusinessOwnerHelpForDistribution(true);
    const serialized = JSON.stringify(storeHelp);

    assert.match(serialized, /not available in this app/);
    assert.match(serialized, /setup instructions sent/);
    assert.doesNotMatch(serialized, /Manage Billing/);
    assert.doesNotMatch(serialized, /start the trial or subscription/);
    assert.doesNotMatch(serialized, /Stripe Billing checkout/);
  });
});

describe("help-video", () => {
  it("parses YouTube and Vimeo URLs for embeds", () => {
    assert.equal(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(parseVimeoId("https://vimeo.com/123456789"), "123456789");
  });

  it("resolves embed sources by type", () => {
    const youtube = resolveVideoEmbed({
      type: "youtube",
      url: "https://www.youtube.com/watch?v=abc123XYZ00",
    });
    assert.ok(youtube?.src.includes("youtube-nocookie.com/embed/abc123XYZ00"));

    const upload = resolveVideoEmbed({
      type: "upload",
      url: "https://cdn.example.com/training/welcome.mp4",
    });
    assert.equal(upload?.kind, "video");
  });
});

describe("help page wiring", () => {
  it("registers the public /help route", async () => {
    const appSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../App.tsx", import.meta.url), "utf8"),
    );
    assert.match(appSource, /path="\/help"/);
    assert.match(appSource, /const Help = lazyWithRetry/);
  });

  it("links Help from layout navigation and footer", async () => {
    const layoutSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../components/layout.tsx", import.meta.url), "utf8"),
    );
    assert.match(layoutSource, /href="\/help"/);
    assert.match(layoutSource, /Help Center/);
  });

  it("uses searchable guide components and conditionally renders videos", async () => {
    const helpSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../pages/help.tsx", import.meta.url), "utf8"),
    );
    assert.match(helpSource, /HelpGuideAccordion/);
    assert.match(helpSource, /filterHelpDirectory/);
    assert.match(helpSource, /activeVideos\.length > 0/);
    assert.match(helpSource, /input-help-search/);
    assert.match(helpSource, /link-platform-support-email/);
    assert.doesNotMatch(helpSource, /What(?:'|&apos;)s new/i);
    assert.doesNotMatch(helpSource, /disabled[^>]+Search help articles/);
  });

  it("defines the platform support contact", () => {
    assert.equal(platformSupportContact.providerName, "LaneTech");
    assert.equal(platformSupportContact.email, "Ronnie@LaneTechWV.com");
  });
});
