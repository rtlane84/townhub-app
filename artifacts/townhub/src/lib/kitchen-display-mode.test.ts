import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isKitchenDisplayRoute,
  readKitchenDisplayModePreference,
  writeKitchenDisplayModePreference,
} from "./kitchen-display-mode.ts";

describe("kitchen-display-mode", () => {
  it("detects kitchen display routes", () => {
    assert.equal(isKitchenDisplayRoute("/dashboard/business/kitchen"), true);
    assert.equal(isKitchenDisplayRoute("/dashboard/business/kitchen/"), true);
    assert.equal(isKitchenDisplayRoute("/dashboard/business/orders"), false);
  });

  it("persists preference in localStorage", () => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };

    assert.equal(readKitchenDisplayModePreference(), false);
    writeKitchenDisplayModePreference(true);
    assert.equal(readKitchenDisplayModePreference(), true);
    writeKitchenDisplayModePreference(false);
    assert.equal(readKitchenDisplayModePreference(), false);

    // @ts-expect-error test cleanup
    delete globalThis.localStorage;
  });
});
