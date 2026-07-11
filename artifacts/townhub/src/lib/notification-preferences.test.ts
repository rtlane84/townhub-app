import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  setNotificationPreferences,
} from "./notification-preferences.ts";

describe("notification-preferences", () => {
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

  it("returns defaults for a new business", () => {
    assert.deepEqual(getNotificationPreferences(42), DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("persists sound and volume per business", () => {
    setNotificationPreferences(7, { soundsEnabled: true, volume: 55 });

    const prefs = getNotificationPreferences(7);
    assert.equal(prefs.soundsEnabled, true);
    assert.equal(prefs.volume, 55);
  });

  it("does not reset volume when updating another field", () => {
    setNotificationPreferences(7, { volume: 35 });
    setNotificationPreferences(7, { soundsEnabled: true });
    assert.equal(getNotificationPreferences(7).volume, 35);
  });

  it("migrates legacy order-sounds-enabled flag", () => {
    storage.set("local-order-hub:order-sounds-enabled", "true");
    assert.equal(getNotificationPreferences(3).soundsEnabled, true);
  });
});
