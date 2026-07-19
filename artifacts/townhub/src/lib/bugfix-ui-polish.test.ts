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

describe("event list layout", () => {
  it("uses compact EventListRow for homepage and All events; uniform featured carousel", () => {
    const homeFeatured = readFileSync(
      new URL("../components/home-featured-events.tsx", import.meta.url),
      "utf8",
    );
    assert.match(homeFeatured, /EventListRow/);
    assert.match(homeFeatured, /h-\[3\.75rem\] w-20/);

    const eventListRow = readFileSync(
      new URL("../components/event-list-row.tsx", import.meta.url),
      "utf8",
    );
    assert.match(eventListRow, /object-cover/);
    assert.match(eventListRow, /formatEventSchedule/);
    assert.match(eventListRow, /event\.location/);

    const eventsPage = readFileSync(
      new URL("../pages/events.tsx", import.meta.url),
      "utf8",
    );
    assert.match(eventsPage, /EventListRow/);
    assert.match(
      eventsPage,
      /itemClassName="basis-\[72%\] sm:basis-\[40%\] lg:basis-\[28%\]"/,
    );
    assert.match(eventsPage, /uniform/);

    const eventCard = readFileSync(
      new URL("../components/event-card.tsx", import.meta.url),
      "utf8",
    );
    assert.match(eventCard, /uniform\?: boolean/);
    assert.match(eventCard, /aspect-\[4\/3\]/);
    assert.match(eventCard, /truncateEventDescription/);
    assert.match(eventCard, /min-h-\[2\.5rem\] line-clamp-2/);
  });
});

describe("event description card limit", () => {
  it("exports a 120-character card limit used by admin and submit forms", async () => {
    const { EVENT_DESCRIPTION_CARD_MAX_LENGTH, truncateEventDescription } =
      await import("./event-description.ts");
    assert.equal(EVENT_DESCRIPTION_CARD_MAX_LENGTH, 120);
    assert.equal(truncateEventDescription("short"), "short");
    assert.ok(truncateEventDescription("a".repeat(200)).length <= 120);

    const adminEvents = readFileSync(
      new URL("../pages/dashboard/admin/events.tsx", import.meta.url),
      "utf8",
    );
    assert.match(adminEvents, /EVENT_DESCRIPTION_CARD_MAX_LENGTH/);
    assert.match(adminEvents, /maxLength=\{EVENT_DESCRIPTION_CARD_MAX_LENGTH\}/);

    const submitForm = readFileSync(
      new URL("../components/event-submit-form.tsx", import.meta.url),
      "utf8",
    );
    assert.match(submitForm, /maxLength=\{EVENT_DESCRIPTION_CARD_MAX_LENGTH\}/);
  });
});

describe("event submit wording", () => {
  it("uses Submit Event as the primary action label", () => {
    assert.match(eventSubmitSource, />\s*Submit Event\s*</);
    assert.doesNotMatch(eventSubmitSource, /Submit for Review/);
  });

  it("labels the events page open-form control Submit Event", () => {
    const eventsPage = readFileSync(
      new URL("../pages/events.tsx", import.meta.url),
      "utf8",
    );
    assert.match(eventsPage, /formOpen \? "Hide" : "Submit Event"/);
  });
});

describe("food truck map fit control", () => {
  it("labels the control as Show all stops and disables when empty", () => {
    assert.match(mapCanvasSource, /aria-label="Show all stops"/);
    assert.match(mapCanvasSource, /button-food-truck-map-fit-stops/);
    assert.match(mapCanvasSource, /disabled=\{!hasStops\}/);
    assert.match(mapCanvasSource, /text-foreground/);
    assert.match(mapCanvasSource, /Crosshair/);
    assert.doesNotMatch(mapCanvasSource, /Maximize2/);
    assert.doesNotMatch(mapCanvasSource, /LocateFixed/);
    assert.doesNotMatch(mapCanvasSource, /variant="secondary"/);
  });

  it("uses a solid SVG pin instead of a white Leaflet div-icon box", () => {
    assert.match(mapCanvasSource, /food-truck-map-marker-svg/);
    assert.doesNotMatch(mapCanvasSource, /food-truck-map-marker-pin/);
  });
});
