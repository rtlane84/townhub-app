import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessOwnerWorkflows,
  customerWorkflows,
  customerFaqs,
  businessOwnerFaqs,
} from "./help-content.ts";

describe("help-content", () => {
  it("covers core customer workflows", () => {
    const ids = customerWorkflows.map((w) => w.id);
    assert.ok(ids.includes("browse"));
    assert.ok(ids.includes("order-online"));
    assert.ok(ids.includes("track-orders"));
    assert.ok(ids.includes("appointments"));
    for (const workflow of customerWorkflows) {
      assert.ok(workflow.steps.length >= 2, `${workflow.id} should have steps`);
    }
  });

  it("covers core business owner workflows", () => {
    const ids = businessOwnerWorkflows.map((w) => w.id);
    assert.ok(ids.includes("list-business"));
    assert.ok(ids.includes("business-hub"));
    assert.ok(ids.includes("orders"));
    assert.ok(ids.includes("settings"));
    for (const workflow of businessOwnerWorkflows) {
      assert.ok(workflow.steps.length >= 2, `${workflow.id} should have steps`);
    }
  });

  it("includes FAQ entries for both audiences", () => {
    assert.ok(customerFaqs.length >= 2);
    assert.ok(businessOwnerFaqs.length >= 2);
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
});
