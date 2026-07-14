import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { createCorsOptions, parseProductionAllowedOrigins } from "./cors-config";

describe("parseProductionAllowedOrigins", () => {
  const previous = {
    APP_BASE_URL: process.env.APP_BASE_URL,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
    NATIVE_ALLOWED_ORIGINS: process.env.NATIVE_ALLOWED_ORIGINS,
  };

  afterEach(() => {
    if (previous.APP_BASE_URL === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previous.APP_BASE_URL;
    if (previous.CORS_ALLOWED_ORIGINS === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = previous.CORS_ALLOWED_ORIGINS;
    if (previous.NATIVE_ALLOWED_ORIGINS === undefined) delete process.env.NATIVE_ALLOWED_ORIGINS;
    else process.env.NATIVE_ALLOWED_ORIGINS = previous.NATIVE_ALLOWED_ORIGINS;
  });

  it("includes APP_BASE_URL origin and comma-separated extras", () => {
    process.env.APP_BASE_URL = "https://townhub.example/";
    process.env.CORS_ALLOWED_ORIGINS = "https://preview.example,https://admin.example";
    const origins = parseProductionAllowedOrigins();
    assert.deepEqual(origins, [
      "https://townhub.example",
      "https://preview.example",
      "https://admin.example",
    ]);
  });

  it("allows only known localhost native WebView origins", () => {
    process.env.APP_BASE_URL = "https://townhub.example";
    process.env.NATIVE_ALLOWED_ORIGINS = [
      "capacitor://localhost",
      "APP://localhost/",
      "capacitor://evil.example",
      "https://not-native.example",
    ].join(",");

    assert.deepEqual(parseProductionAllowedOrigins(), [
      "https://townhub.example",
      "capacitor://localhost",
      "app://localhost",
    ]);
  });
});

describe("createCorsOptions", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAppBase = process.env.APP_BASE_URL;

  beforeEach(() => {
    process.env.APP_BASE_URL = "https://townhub.example";
  });

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousAppBase === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previousAppBase;
  });

  it("reflects any origin in development", () => {
    process.env.NODE_ENV = "development";
    const options = createCorsOptions();
    assert.equal(options.origin, true);
    assert.equal(options.credentials, true);
  });

  it("allows only configured origins in production", () => {
    process.env.NODE_ENV = "production";
    const options = createCorsOptions();
    assert.equal(typeof options.origin, "function");

    const originFn = options.origin as (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => void;

    let allowed: boolean | undefined;
    originFn("https://townhub.example", (_err, value) => {
      allowed = value;
    });
    assert.equal(allowed, true);

    let rejected: boolean | undefined;
    originFn("https://evil.example", (_err, value) => {
      rejected = value;
    });
    assert.equal(rejected, false);
  });

  it("allows requests with no Origin header", () => {
    process.env.NODE_ENV = "production";
    const options = createCorsOptions();
    const originFn = options.origin as (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => void;

    let allowed: boolean | undefined;
    originFn(undefined, (_err, value) => {
      allowed = value;
    });
    assert.equal(allowed, true);
  });
});
