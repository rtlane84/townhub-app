import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveClerkPublishableKeyForRuntime,
  resolveClerkProxyUrlForRuntime,
  resolveClerkStandardBrowserForRuntime,
} from "./clerk-config-core.ts";

test("resolveClerkPublishableKeyForRuntime keeps the configured production key on web", () => {
  const productionKey = "pk_live_Y2xlcmsudG93bmh1Yi5pbyQ";

  assert.equal(
    resolveClerkPublishableKeyForRuntime({
      hostname: "townhaven.io",
      envKey: productionKey,
      isNative: false,
    }),
    productionKey,
  );
});

test("resolveClerkPublishableKeyForRuntime derives a key only when none is configured", () => {
  assert.equal(
    resolveClerkPublishableKeyForRuntime({
      hostname: "townhaven.io",
      envKey: undefined,
      isNative: false,
    }),
    "pk_live_Y2xlcmsudG93bmhhdmVuLmlvJA",
  );
});

test("resolveClerkProxyUrlForRuntime ignores proxy on native", () => {
  assert.equal(
    resolveClerkProxyUrlForRuntime({
      proxyUrl: "https://staging.townhaven.io/api/__clerk",
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
      proxyUrl: "https://staging.townhaven.io/api/__clerk",
      isNative: false,
    }),
    "https://staging.townhaven.io/api/__clerk",
  );
});

test("resolveClerkStandardBrowserForRuntime disables browser cookies on native", () => {
  assert.equal(resolveClerkStandardBrowserForRuntime(true), false);
});

test("resolveClerkStandardBrowserForRuntime keeps browser mode on web", () => {
  assert.equal(resolveClerkStandardBrowserForRuntime(false), true);
});
