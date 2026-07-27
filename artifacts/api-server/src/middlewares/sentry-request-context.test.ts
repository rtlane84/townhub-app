import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request } from "express";
import { extractBusinessIdFromRequest } from "./sentry-request-context";

function asReq(partial: {
  params?: Record<string, string>;
  body?: unknown;
}): Request {
  return partial as unknown as Request;
}

describe("extractBusinessIdFromRequest", () => {
  it("reads businessId from JSON body", () => {
    assert.equal(
      extractBusinessIdFromRequest(asReq({ body: { businessId: 42 } })),
      42,
    );
  });

  it("reads businessId from route params", () => {
    assert.equal(
      extractBusinessIdFromRequest(asReq({ params: { businessId: "7" } })),
      7,
    );
  });

  it("does not treat generic :id params as businessId", () => {
    assert.equal(extractBusinessIdFromRequest(asReq({ params: { id: "99" } })), null);
  });

  it("ignores non-numeric and missing values", () => {
    assert.equal(extractBusinessIdFromRequest(asReq({ body: { businessId: "x" } })), null);
    assert.equal(extractBusinessIdFromRequest(asReq({ body: {} })), null);
    assert.equal(extractBusinessIdFromRequest(asReq({})), null);
  });
});
