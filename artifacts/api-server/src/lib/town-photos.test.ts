import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTownPhotos } from "../lib/town-photos.ts";

describe("normalizeTownPhotos", () => {
  it("returns empty array for non-arrays", () => {
    assert.deepEqual(normalizeTownPhotos(null), []);
    assert.deepEqual(normalizeTownPhotos(undefined), []);
    assert.deepEqual(normalizeTownPhotos("x"), []);
  });

  it("drops entries without urls and renumbers sort order", () => {
    const result = normalizeTownPhotos([
      {
        id: "a",
        url: "https://example.com/a.jpg",
        caption: "A",
        isPrimary: false,
        sortOrder: 5,
      },
      { id: "b", url: "  ", caption: "skip", isPrimary: true, sortOrder: 0 },
      {
        id: "c",
        url: "https://example.com/c.jpg",
        caption: null,
        isPrimary: true,
        sortOrder: 1,
      },
    ]);
    assert.equal(result.length, 2);
    assert.equal(result[0]?.id, "c");
    assert.equal(result[0]?.isPrimary, true);
    assert.equal(result[0]?.sortOrder, 0);
    assert.equal(result[1]?.id, "a");
    assert.equal(result[1]?.isPrimary, false);
    assert.equal(result[1]?.sortOrder, 1);
  });

  it("ensures only one primary photo", () => {
    const result = normalizeTownPhotos([
      {
        id: "1",
        url: "https://example.com/1.jpg",
        isPrimary: true,
        sortOrder: 0,
      },
      {
        id: "2",
        url: "https://example.com/2.jpg",
        isPrimary: true,
        sortOrder: 1,
      },
    ]);
    assert.equal(result.filter((p) => p.isPrimary).length, 1);
    assert.equal(result[0]?.isPrimary, true);
  });
});
