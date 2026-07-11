import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  getProviderTestSnapshot,
  recordProviderTestFailure,
  recordProviderTestSuccess,
  resolveConnectionDisplay,
} from "./notification-test-state.ts";

describe("notification-test-state", () => {
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

  it("records success and failure per provider", () => {
    recordProviderTestSuccess(3, "email");
    assert.equal(getProviderTestSnapshot(3, "email").lastError, null);
    assert.ok(getProviderTestSnapshot(3, "email").lastSuccessAt);

    recordProviderTestFailure(3, "email", "SMTP failed");
    const snapshot = getProviderTestSnapshot(3, "email");
    assert.equal(snapshot.lastError, "SMTP failed");
    assert.ok(snapshot.lastSuccessAt);
  });

  it("resolves connection display states", () => {
    assert.equal(resolveConnectionDisplay({ lastSuccessAt: null, lastError: null }).status, "not_tested");
    assert.equal(
      resolveConnectionDisplay({ lastSuccessAt: "2026-07-05T22:42:00.000Z", lastError: null }).status,
      "connected",
    );
    assert.equal(
      resolveConnectionDisplay({ lastSuccessAt: null, lastError: "Webhook rejected" }).status,
      "failed",
    );
  });
});
