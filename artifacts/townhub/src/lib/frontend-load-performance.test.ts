import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("frontend load performance wiring", () => {
  it("lazy-loads dashboard, kitchen, food trucks, setup, and billing routes", async () => {
    const source = await readFile(
      new URL("../App.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /lazy\(\(\) => import\("@\/pages\/food-trucks"\)\)/);
    assert.match(
      source,
      /lazy\(\(\) => import\("@\/pages\/dashboard\/business\/kitchen"\)\)/,
    );
    assert.match(
      source,
      /lazy\(\(\) => import\("@\/pages\/dashboard\/business\/billing"\)\)/,
    );
    assert.match(
      source,
      /lazy\(\(\) => import\("@\/pages\/dashboard\/admin\/overview"\)\)/,
    );
    assert.match(source, /lazy\(\(\) => import\("@\/pages\/setup"\)\)/);
    assert.match(source, /<Suspense fallback=\{<RoutePageLoader/);
    assert.doesNotMatch(
      source,
      /import FoodTrucks from "@\/pages\/food-trucks"/,
    );
    assert.doesNotMatch(
      source,
      /import BusinessKitchen from "@\/pages\/dashboard\/business\/kitchen"/,
    );
  });

  it("keeps the public home page eagerly loaded", async () => {
    const source = await readFile(
      new URL("../App.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /import Home from "@\/pages\/home"/);
    assert.match(source, /<Route path="\/" component=\{Home\}/);
  });

  it("loads Leaflet only from the map canvas chunk", async () => {
    const mapSection = await readFile(
      new URL("../components/food-truck-map.tsx", import.meta.url),
      "utf8",
    );
    const mapCanvas = await readFile(
      new URL("../components/food-truck-map-canvas.tsx", import.meta.url),
      "utf8",
    );
    assert.match(
      mapSection,
      /lazy\(\(\) => import\("\.\/food-truck-map-canvas"\)\)/,
    );
    assert.doesNotMatch(mapSection, /react-leaflet/);
    assert.match(mapCanvas, /react-leaflet/);
    assert.match(mapCanvas, /leaflet\/dist\/leaflet\.css/);
  });

  it("debounces business directory search input", async () => {
    const source = await readFile(
      new URL("../pages/businesses.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /useDebouncedValue/);
    assert.match(source, /SEARCH_DEBOUNCE_MS = 300/);
    assert.match(source, /searchInput/);
  });

  it("serves the homepage hero through responsive optimized media", async () => {
    const hero = await readFile(
      new URL("../components/home-hero-section.tsx", import.meta.url),
      "utf8",
    );
    const carousel = await readFile(
      new URL("../components/town-photo-carousel.tsx", import.meta.url),
      "utf8",
    );
    const responsive = await readFile(
      new URL("../components/responsive-hero-image.tsx", import.meta.url),
      "utf8",
    );
    assert.match(hero, /TownPhotoCarousel/);
    assert.match(hero, /resolveTownPhotoSlides/);
    assert.doesNotMatch(hero, /link\.rel = "preload"/);
    assert.match(carousel, /ResponsiveHeroImage/);
    assert.match(carousel, /heroImageObjectClasses/);
    assert.match(responsive, /<picture>/);
    assert.match(responsive, /image\/avif/);
    assert.match(responsive, /image\/webp/);
    assert.match(responsive, /buildOptimizedMediaUrl/);
  });
});
