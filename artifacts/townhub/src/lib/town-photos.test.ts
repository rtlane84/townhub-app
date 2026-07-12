import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reorderTownPhotos, resolveTownPhotoSlides } from "./town-photos.ts";

describe("resolveTownPhotoSlides", () => {
  it("prefers town photos over the legacy hero image", () => {
    const slides = resolveTownPhotoSlides(
      [
        {
          id: "2",
          url: "https://example.com/2.jpg",
          caption: "Second",
          isPrimary: false,
          sortOrder: 1,
        },
        {
          id: "1",
          url: "https://example.com/1.jpg",
          caption: "First",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      "https://example.com/legacy.jpg",
    );
    assert.equal(slides.length, 2);
    assert.equal(slides[0]?.id, "1");
    assert.equal(slides[0]?.url, "https://example.com/1.jpg");
  });

  it("falls back to the legacy hero when town photos are empty", () => {
    const slides = resolveTownPhotoSlides([], "https://example.com/legacy.jpg");
    assert.deepEqual(slides, [
      {
        id: "legacy-hero",
        url: "https://example.com/legacy.jpg",
        caption: null,
        isPrimary: true,
      },
    ]);
  });

  it("returns an empty list when nothing is configured", () => {
    assert.deepEqual(resolveTownPhotoSlides([], null), []);
    assert.deepEqual(resolveTownPhotoSlides(undefined, "  "), []);
  });
});

describe("reorderTownPhotos", () => {
  it("moves a photo and renumbers sort order", () => {
    const photos = [
      { id: "a", url: "a.jpg", caption: null, isPrimary: true, sortOrder: 0 },
      { id: "b", url: "b.jpg", caption: null, isPrimary: false, sortOrder: 1 },
      { id: "c", url: "c.jpg", caption: null, isPrimary: false, sortOrder: 2 },
    ];
    const reordered = reorderTownPhotos(photos, 2, 0);
    assert.deepEqual(
      reordered.map((photo) => photo.id),
      ["c", "a", "b"],
    );
    assert.deepEqual(
      reordered.map((photo) => photo.sortOrder),
      [0, 1, 2],
    );
  });
});
