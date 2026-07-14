import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const peekCarouselSource = readFileSync(
  new URL("../components/peek-carousel.tsx", import.meta.url),
  "utf8",
);

const eventSubmitSource = readFileSync(
  new URL("../components/event-submit-form.tsx", import.meta.url),
  "utf8",
);

const mapCanvasSource = readFileSync(
  new URL("../components/food-truck-map-canvas.tsx", import.meta.url),
  "utf8",
);

describe("peek carousel single-item width", () => {
  it("keeps one-child rails at peek basis widths instead of full stretch", () => {
    assert.match(peekCarouselSource, /children\.length === 1/);
    assert.match(peekCarouselSource, /basis-\[82%\]/);
    assert.match(peekCarouselSource, /shrink-0 grow-0/);
    assert.doesNotMatch(
      peekCarouselSource,
      /if \(children\.length === 1\) \{\s*return <div className=\{className\}>\{children\[0\]\}<\/div>;/,
    );
  });
});

describe("event submit wording", () => {
  it("uses Submit Event as the primary action label", () => {
    assert.match(eventSubmitSource, />\s*Submit Event\s*</);
    assert.doesNotMatch(eventSubmitSource, /Submit for Review/);
  });
});

describe("food truck map fit control", () => {
  it("labels the control as Show all stops and disables when empty", () => {
    assert.match(mapCanvasSource, /aria-label="Show all stops"/);
    assert.match(mapCanvasSource, /button-food-truck-map-fit-stops/);
    assert.match(mapCanvasSource, /disabled=\{!hasStops\}/);
    assert.doesNotMatch(mapCanvasSource, /LocateFixed/);
  });
});
