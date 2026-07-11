import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  hasNativeSplashShownThisSession,
  markNativeSplashShownThisSession,
  skipNativeSplashOnNextLoad,
} from "./native-splash-session.ts";

describe("native-splash-session", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    (globalThis as { sessionStorage?: Storage }).sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size;
      },
    };
  });

  it("tracks splash shown for the WebView session", () => {
    assert.equal(hasNativeSplashShownThisSession(), false);
    markNativeSplashShownThisSession();
    assert.equal(hasNativeSplashShownThisSession(), true);
  });

  it("skipNativeSplashOnNextLoad marks splash as already shown", () => {
    assert.equal(hasNativeSplashShownThisSession(), false);
    skipNativeSplashOnNextLoad();
    assert.equal(hasNativeSplashShownThisSession(), true);
  });
});
