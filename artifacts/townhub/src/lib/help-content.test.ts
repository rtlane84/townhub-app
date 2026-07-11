import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessOwnerTopics,
  businessOwnerWorkflows,
  customerTopics,
  customerWorkflows,
  customerFaqs,
  businessOwnerFaqs,
  featuredVideos,
  whatsNewItems,
  platformSupportContact,
} from "./help-content.ts";
import { parseYouTubeId, parseVimeoId, resolveVideoEmbed } from "./help-video.ts";

describe("help-content", () => {
  it("includes three featured training videos", () => {
    assert.equal(featuredVideos.length, 3);
    const ids = featuredVideos.map((v) => v.id);
    assert.ok(ids.includes("welcome"));
    assert.ok(ids.includes("customer-training"));
    assert.ok(ids.includes("owner-training"));
  });

  it("includes a whats new section", () => {
    assert.ok(whatsNewItems.length >= 2);
  });

  it("covers core customer topics including guest checkout", () => {
    const ids = customerTopics.map((t) => t.id);
    assert.ok(ids.includes("getting-started"));
    assert.ok(ids.includes("order-online"));
    assert.ok(ids.includes("guest-checkout"));
    assert.ok(ids.includes("track-orders"));
    for (const topic of customerTopics) {
      assert.ok(topic.highlights.length >= 2, `${topic.id} should have highlights`);
    }
  });

  it("covers the business owner guided journey", () => {
    const ids = businessOwnerTopics.map((t) => t.id);
    assert.ok(ids.includes("apply"));
    assert.ok(ids.includes("approval"));
    assert.ok(ids.includes("choose-plan"));
    assert.ok(ids.includes("billing-after-approval"));
    assert.ok(ids.includes("storefront"));
    assert.ok(ids.includes("products"));
    assert.ok(ids.includes("orders"));
    assert.ok(ids.includes("subscriptions-billing"));
    assert.ok(ids.includes("enabled-features"));

    const steps = businessOwnerTopics
      .map((t) => t.journeyStep)
      .filter((s): s is number => s != null);
    assert.equal(steps.length, businessOwnerTopics.length);
    assert.deepEqual([...steps].sort((a, b) => a - b), steps);
  });

  it("keeps legacy workflow exports in sync with topics", () => {
    assert.equal(customerWorkflows.length, customerTopics.length);
    assert.equal(businessOwnerWorkflows.length, businessOwnerTopics.length);
  });

  it("includes FAQ entries for both audiences", () => {
    assert.ok(customerFaqs.length >= 3);
    assert.ok(businessOwnerFaqs.length >= 3);
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
  it("registers the /help route", async () => {
    const appSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../App.tsx", import.meta.url), "utf8"),
    );
    assert.match(appSource, /path="\/help"/);
    assert.match(appSource, /from "@\/pages\/help"/);
  });

  it("links Help from layout navigation and footer", async () => {
    const layoutSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../components/layout.tsx", import.meta.url), "utf8"),
    );
    assert.match(layoutSource, /href="\/help"/);
    assert.match(layoutSource, /Help Center/);
  });

  it("uses training hub components on the help page", async () => {
    const helpSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../pages/help.tsx", import.meta.url), "utf8"),
    );
    assert.match(helpSource, /HelpVideoCard/);
    assert.match(helpSource, /HelpTopicCard/);
    assert.match(helpSource, /What's new|What&apos;s new/);
    assert.match(helpSource, /Search help articles/);
    assert.match(helpSource, /platformSupportContact/);
    assert.match(helpSource, /link-platform-support-email/);
    assert.match(helpSource, /Contact support/);
  });

  it("defines LaneTech platform support contact", () => {
    assert.equal(platformSupportContact.providerName, "LaneTech");
    assert.equal(platformSupportContact.email, "Ronnie@LaneTechWV.com");
  });
});
