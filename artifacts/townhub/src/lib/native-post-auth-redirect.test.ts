import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  rememberPostAuthRedirect,
  consumePostAuthRedirect,
  peekPostAuthRedirect,
} from "./native-post-auth-redirect.ts";

describe("native-post-auth-redirect", () => {
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
    (globalThis as { window?: { location: { pathname: string; search: string; hash: string } } }).window = {
      location: { pathname: "/list-your-business", search: "", hash: "" },
    };
  });

  it("remembers and consumes a return path", () => {
    rememberPostAuthRedirect("/list-your-business");
    assert.equal(peekPostAuthRedirect(), "/list-your-business");
    assert.equal(consumePostAuthRedirect("/"), "/list-your-business");
    assert.equal(peekPostAuthRedirect(), null);
  });

  it("defaults to current location when no path passed", () => {
    rememberPostAuthRedirect();
    assert.equal(consumePostAuthRedirect("/"), "/list-your-business");
  });

  it("ignores auth/callback paths", () => {
    rememberPostAuthRedirect("/sso-callback?x=1");
    assert.equal(consumePostAuthRedirect("/"), "/");
  });
});
