import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("frontend load performance wiring", () => {
  it("lazy-loads dashboard, kitchen, food trucks, setup, and billing routes", async () => {
    const source = await readFile(
      new URL("../App.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /lazyWithRetry\(\(\) => import\("@\/pages\/food-trucks"\)\)/);
    assert.match(
      source,
      /lazyWithRetry\(\(\) => import\("@\/pages\/dashboard\/business\/kitchen"\)\)/,
    );
    assert.match(
      source,
      /lazyWithRetry\(\(\) => import\("@\/pages\/dashboard\/business\/billing"\)\)/,
    );
    assert.match(
      source,
      /lazyWithRetry\(\(\) => import\("@\/pages\/dashboard\/admin\/overview"\)\)/,
    );
    assert.match(source, /lazyWithRetry\(\(\) => import\("@\/pages\/setup"\)\)/);
    assert.match(source, /from "@\/lib\/lazy-with-retry"/);
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

  it("lazy-loads the public home page", async () => {
    const source = await readFile(
      new URL("../App.tsx", import.meta.url),
      "utf8",
    );
    assert.match(
      source,
      /const Home = lazyWithRetry\(\(\) => import\("@\/pages\/home"\)\)/,
    );
    assert.match(source, /<SuspenseRoute path="\/" component=\{Home\}/);
    assert.doesNotMatch(source, /import Home from "@\/pages\/home"/);
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
      /lazyWithRetry\(\(\) => import\("\.\/food-truck-map-canvas"\)\)/,
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
    const responsiveMedia = await readFile(
      new URL("../components/optimized-media-image.tsx", import.meta.url),
      "utf8",
    );
    assert.match(hero, /TownPhotoCarousel/);
    assert.match(hero, /resolveTownPhotoSlides/);
    assert.doesNotMatch(hero, /link\.rel = "preload"/);
    assert.match(carousel, /ResponsiveHeroImage/);
    assert.match(carousel, /heroImageObjectClasses/);
    assert.match(responsive, /OptimizedMediaImage/);
    assert.match(responsiveMedia, /buildOptimizedSrcSet/);
    assert.match(responsiveMedia, /"webp"/);
    assert.match(responsiveMedia, /loading=\{priority \|\| eager \? "eager" : "lazy"\}/);
    assert.match(responsiveMedia, /fetchPriority=\{priority \? "high" : eager \? "auto" : "low"\}/);
    assert.doesNotMatch(responsive, /avif/i);
  });

  it("keeps the homepage carousel manual and only prioritizes the initial slide", async () => {
    const carousel = await readFile(
      new URL("../components/town-photo-carousel.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(carousel, /setInterval|AUTO_ADVANCE/);
    assert.match(carousel, /priority=\{index === 0\}/);
    assert.match(carousel, /aria-label=\{`Show town photo \$\{index \+ 1\}`\}/);
    assert.match(carousel, /aria-label="Choose a town photo"/);
    assert.match(carousel, /h-11 w-11/);
    assert.match(carousel, /const isActive = index === selected/);
    assert.match(carousel, /width=\{640\}/);
    assert.match(carousel, /height=\{640\}/);
  });

  it("allows viewport zoom and reserves a stable route-loading height", async () => {
    const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
    const loader = await readFile(
      new URL("../components/route-page-loader.tsx", import.meta.url),
      "utf8",
    );
    const dashboard = await readFile(
      new URL("../components/dashboard-layout.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(html, /maximum-scale/);
    assert.match(loader, /100dvh/);
    assert.match(dashboard, /min-h-\[calc\(100dvh-var\(--site-header-height,4rem\)\)\]/);
  });

  it("uses named controls without incomplete tab semantics", async () => {
    const help = await readFile(new URL("../pages/help.tsx", import.meta.url), "utf8");
    const peek = await readFile(
      new URL("../components/peek-carousel.tsx", import.meta.url),
      "utf8",
    );
    const map = await readFile(
      new URL("../components/food-truck-map-canvas.tsx", import.meta.url),
      "utf8",
    );
    const businesses = await readFile(
      new URL("../components/business-directory.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(help, /TabsTrigger|TabsList/);
    assert.match(help, /aria-pressed=\{selected\}/);
    assert.doesNotMatch(peek, /role="tab"/);
    assert.match(peek, /aria-current/);
    assert.match(peek, /h-11 w-11/);
    assert.match(map, /title=\{`\$\{truck\.businessName/);
    assert.match(map, /alt=\{`\$\{truck\.businessName/);
    assert.doesNotMatch(businesses, /className="flex min-h-0 min-w-0 flex-1 flex-col"\s+aria-label=/);
  });
});
