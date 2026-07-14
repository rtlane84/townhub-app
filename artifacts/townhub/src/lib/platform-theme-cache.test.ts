import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import type { PlatformTheme } from "@workspace/api-client-react";
import {
  clearCachedPlatformTheme,
  isValidCachedPlatformTheme,
  readCachedPlatformTheme,
  writeCachedPlatformTheme,
} from "./platform-theme-cache.ts";

const sampleTheme: PlatformTheme = {
  id: 1,
  primaryColor: "#1E3A8A",
  accentColor: "#F59E0B",
  backgroundColor: "#F4F5F8",
  buttonColor: "#1E3A8A",
  platformName: "Clay TownHub",
};

describe("platform-theme-cache", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    globalThis.localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });

  afterEach(() => {
    // @ts-expect-error cleanup test shim
    delete globalThis.localStorage;
  });

  it("returns null when empty", () => {
    assert.equal(readCachedPlatformTheme(), null);
  });

  it("round-trips a valid theme", () => {
    writeCachedPlatformTheme(sampleTheme);
    assert.deepEqual(readCachedPlatformTheme(), sampleTheme);
  });

  it("rejects invalid cached payloads", () => {
    assert.equal(isValidCachedPlatformTheme({ id: 1 }), false);
    assert.equal(isValidCachedPlatformTheme(null), false);
    storage.set("townhub:platform-theme-v1", JSON.stringify({ id: "x" }));
    assert.equal(readCachedPlatformTheme(), null);
  });

  it("clears stored theme", () => {
    writeCachedPlatformTheme(sampleTheme);
    clearCachedPlatformTheme();
    assert.equal(readCachedPlatformTheme(), null);
  });
});
