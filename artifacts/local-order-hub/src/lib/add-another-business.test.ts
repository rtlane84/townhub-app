import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  ADD_ANOTHER_BUSINESS_HREF,
  ADD_ANOTHER_BUSINESS_LABEL,
} from "./add-another-business.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("add another business discoverability", () => {
  it("links to the list-your-business apply flow", () => {
    assert.equal(ADD_ANOTHER_BUSINESS_HREF, "/list-your-business");
    const label = ADD_ANOTHER_BUSINESS_LABEL;
    assert.equal(label, "Add another business");
  });

  it("surfaces in the business switcher menu", () => {
    const switcher = readFileSync(
      join(packageRoot, "src/components/business-switcher.tsx"),
      "utf8",
    );
    assert.match(switcher, /AddAnotherBusinessMenuItem/);
  });

  it("surfaces on overview and settings pages", () => {
    const overview = readFileSync(
      join(packageRoot, "src/pages/dashboard/business/overview.tsx"),
      "utf8",
    );
    const settings = readFileSync(
      join(packageRoot, "src/pages/dashboard/business/settings.tsx"),
      "utf8",
    );
    assert.match(overview, /AddAnotherBusinessLink/);
    assert.match(settings, /AddAnotherBusinessButton/);
    assert.match(settings, /Your businesses/);
  });

  it("uses add-another wording when owner already has a business", () => {
    const applyPage = readFileSync(
      join(packageRoot, "src/pages/list-your-business.tsx"),
      "utf8",
    );
    assert.match(applyPage, /hasExistingBusinesses \? "Add another business"/);
  });
});
