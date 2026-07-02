import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { requireJobSecret } from "../middlewares/requireJobSecret";

function mockResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: unknown };
}

describe("requireJobSecret", () => {
  it("returns 503 when JOB_SECRET is missing", () => {
    delete process.env.JOB_SECRET;
    const req = { headers: {} } as Request;
    const res = mockResponse();
    let nextCalled = false;

    requireJobSecret(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 503);
    assert.match(String((res.body as { error?: string }).error), /JOB_SECRET missing/i);
  });

  it("calls next when bearer token matches JOB_SECRET", () => {
    process.env.JOB_SECRET = "test-job-secret";
    const req = {
      headers: { authorization: "Bearer test-job-secret" },
    } as Request;
    const res = mockResponse();
    let nextCalled = false;

    requireJobSecret(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  });
});
