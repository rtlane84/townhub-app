import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("business-listing public availability wiring", () => {
  it("prefers server publicAvailability and keeps status separate from schedule", () => {
    const source = readFileSync(join(here, "business-listing.ts"), "utf8");
    assert.match(source, /evaluatePublicAvailability/);
    assert.match(source, /business\.publicAvailability/);
    assert.match(source, /statusLabel: summary\.statusLabel/);
    // Card consumers get status alone; schedule stays on StorefrontStatusLine.
    assert.match(
      source,
      /return \{ isOpen: line\.isOpen, label: line\.statusLabel \}/,
    );
    assert.doesNotMatch(
      source,
      /\$\{line\.statusLabel\} · \$\{line\.scheduleLabel\}/,
    );
  });

  it("directory cards render status and schedule on separate lines", () => {
    const directory = readFileSync(
      join(here, "../components/business-directory.tsx"),
      "utf8",
    );
    assert.match(directory, /statusLine\.statusLabel/);
    assert.match(directory, /statusLine\.scheduleLabel/);
    assert.doesNotMatch(
      directory,
      /statusLine\.statusLabel[\s\S]{0,40}· \$\{statusLine\.scheduleLabel\}/,
    );
  });

  it("storefront location card shows mobile availability; hours card remains for fixed businesses", () => {
    const locationCard = readFileSync(
      join(here, "../components/storefront-location-card.tsx"),
      "utf8",
    );
    assert.match(locationCard, /Mobile business/);
    assert.match(locationCard, /availability\.statusLabel/);
    assert.match(locationCard, /No upcoming stops are posted yet/);

    const storefront = readFileSync(join(here, "../pages/storefront.tsx"), "utf8");
    assert.match(storefront, /isMobileBusiness \?/);
    assert.match(storefront, /StorefrontLocationCard/);
    assert.match(storefront, /availability=\{statusLine\}/);

    const hoursCard = readFileSync(
      join(here, "../components/storefront-hours-card.tsx"),
      "utf8",
    );
    assert.match(hoursCard, /structuredHours/);
  });
});
