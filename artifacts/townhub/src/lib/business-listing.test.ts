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

  it("featured cards keep status/schedule lines; directory rows use storefront badge", () => {
    const directory = readFileSync(
      join(here, "../components/business-directory.tsx"),
      "utf8",
    );
    // Featured cards still show open status + optional schedule on separate lines.
    assert.match(directory, /statusLine\.statusLabel/);
    assert.match(directory, /statusLine\.scheduleLabel/);
    assert.doesNotMatch(
      directory,
      /statusLine\.statusLabel[\s\S]{0,40}· \$\{statusLine\.scheduleLabel\}/,
    );
    // Directory list rows reserve a storefront badge line instead of hours status.
    assert.match(directory, /getBusinessStorefrontBadge/);
    assert.match(directory, /BusinessDirectoryRow[\s\S]*storefrontBadge/);
    assert.doesNotMatch(
      directory,
      /function BusinessDirectoryRow[\s\S]*getStorefrontStatusLine/,
    );

    const homePopular = readFileSync(
      join(here, "../components/home-popular-businesses.tsx"),
      "utf8",
    );
    assert.match(homePopular, /getBusinessStorefrontBadge/);
    assert.doesNotMatch(homePopular, /getBusinessOpenStatus/);
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
