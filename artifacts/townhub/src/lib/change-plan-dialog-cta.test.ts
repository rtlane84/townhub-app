import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dialogSource = readFileSync(
  join(packageRoot, "src/components/subscription/change-plan-dialog.tsx"),
  "utf8",
);

describe("change plan dialog CTA", () => {
  it("always confirms a plan change and never offers Start Free Trial", () => {
    assert.match(dialogSource, /Confirm change/);
    assert.doesNotMatch(dialogSource, /pricingPlanCtaLabel/);
    assert.doesNotMatch(dialogSource, /Start Free Trial/);
    assert.doesNotMatch(dialogSource, /trialDays/);
  });
});
