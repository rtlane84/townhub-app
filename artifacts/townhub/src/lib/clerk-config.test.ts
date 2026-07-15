import assert from "node:assert/strict";
import test from "node:test";
import { resolveClerkProxyUrlForRuntime } from "./clerk-config-core.ts";

test("resolveClerkProxyUrlForRuntime ignores proxy on native", () => {
  assert.equal(
    resolveClerkProxyUrlForRuntime({
      proxyUrl: "https://staging.townhub.io/api/__clerk",
      isNative: true,
    }),
    undefined,
  );
});

test("resolveClerkProxyUrlForRuntime returns undefined for localhost proxy on web", () => {
  assert.equal(
    resolveClerkProxyUrlForRuntime({
      proxyUrl: "http://localhost:8080/api/__clerk",
      isNative: false,
    }),
    undefined,
  );
});

test("resolveClerkProxyUrlForRuntime keeps HTTPS proxy on web", () => {
  assert.equal(
    resolveClerkProxyUrlForRuntime({
      proxyUrl: "https://staging.townhub.io/api/__clerk",
      isNative: false,
    }),
    "https://staging.townhub.io/api/__clerk",
  );
});
