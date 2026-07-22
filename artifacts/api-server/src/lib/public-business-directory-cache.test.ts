import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  getPublicBusinessDirectoryCache,
  invalidatePublicBusinessDirectoryCache,
  setPublicBusinessDirectoryCache,
} from "./public-business-directory-cache.ts";

describe("public business directory cache", () => {
  afterEach(() => invalidatePublicBusinessDirectoryCache());

  it("stores values and clears them on invalidation", () => {
    setPublicBusinessDirectoryCache("all", [{ id: 1 }]);
    assert.deepEqual(getPublicBusinessDirectoryCache("all"), [{ id: 1 }]);

    invalidatePublicBusinessDirectoryCache();
    assert.equal(getPublicBusinessDirectoryCache("all"), undefined);
  });

  it("evicts the least recently used entry when the cache is full", () => {
    for (let index = 0; index < 32; index += 1) {
      setPublicBusinessDirectoryCache(`key-${index}`, index);
    }
    assert.equal(getPublicBusinessDirectoryCache("key-0"), 0);

    setPublicBusinessDirectoryCache("key-32", 32);

    assert.equal(getPublicBusinessDirectoryCache("key-1"), undefined);
    assert.equal(getPublicBusinessDirectoryCache("key-0"), 0);
    assert.equal(getPublicBusinessDirectoryCache("key-32"), 32);
  });
});
