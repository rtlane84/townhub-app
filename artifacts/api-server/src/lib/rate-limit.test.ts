import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { describe, it } from "node:test";
import express from "express";
import {
  isOrderLookupRoute,
  isOwnerDashboardRoute,
  isReadLimitedRoute,
  isStripeWebhookPath,
  isWriteLimitedRoute,
  RATE_LIMIT_ERROR_MESSAGE,
  shouldSkipRateLimit,
} from "./rate-limit-paths.ts";
import { createWriteRateLimiter } from "../middlewares/rate-limit.ts";

describe("rate-limit paths", () => {
  it("skips Stripe webhook path", () => {
    assert.equal(isStripeWebhookPath("/checkout/webhook"), true);
    assert.equal(shouldSkipRateLimit("/checkout/webhook", "POST"), true);
  });

  it("matches public write endpoints", () => {
    assert.equal(isWriteLimitedRoute("/orders", "POST"), true);
    assert.equal(isWriteLimitedRoute("/checkout/session", "POST"), true);
    assert.equal(isWriteLimitedRoute("/appointment-requests", "POST"), true);
    assert.equal(isWriteLimitedRoute("/businesses/apply", "POST"), true);
    assert.equal(isWriteLimitedRoute("/businesses/register", "POST"), true);
    assert.equal(isWriteLimitedRoute("/support/reports", "POST"), true);
    assert.equal(isWriteLimitedRoute("/media/upload", "POST"), true);
    assert.equal(
      isWriteLimitedRoute("/businesses/abc/food-truck-locations", "POST"),
      true,
    );
  });

  it("does not limit authenticated owner appointment creates", () => {
    assert.equal(
      isWriteLimitedRoute("/businesses/abc/appointment-requests", "POST"),
      false,
    );
  });

  it("does not limit GET order reads", () => {
    assert.equal(isWriteLimitedRoute("/orders", "GET"), false);
    assert.equal(isWriteLimitedRoute("/orders/abc", "GET"), false);
  });

  it("matches expensive public read endpoints", () => {
    assert.equal(isReadLimitedRoute("/weather", "GET"), true);
    assert.equal(isReadLimitedRoute("/media/optimize", "GET"), true);
    assert.equal(isReadLimitedRoute("/food-truck-locations/today", "GET"), true);
    assert.equal(isReadLimitedRoute("/food-truck-locations/upcoming", "GET"), true);
    assert.equal(isReadLimitedRoute("/weather", "POST"), false);
  });

  it("routes guest order lookup to dedicated limiter", () => {
    assert.equal(isOrderLookupRoute("/orders/42", "GET"), true);
    assert.equal(isReadLimitedRoute("/orders/42", "GET"), false);
  });

  it("recognizes authenticated owner dashboard polling routes", () => {
    assert.equal(isOwnerDashboardRoute("/businesses/1/orders", "GET"), true);
    assert.equal(isOwnerDashboardRoute("/businesses/1/orders/summary", "GET"), true);
    assert.equal(isOwnerDashboardRoute("/businesses/1/appointment-requests", "GET"), true);
    assert.equal(isOwnerDashboardRoute("/businesses/1/live-events", "GET"), true);
    assert.equal(isOwnerDashboardRoute("/businesses/1/orders", "POST"), false);
    assert.equal(isOwnerDashboardRoute("/orders/42", "GET"), false);
  });
});

describe("write rate limiter", () => {
  it("returns 429 with a clear JSON error after the limit is exceeded", async () => {
    const app = express();
    const limiter = createWriteRateLimiter(2, 60_000);
    app.post("/orders", limiter, (_req, res) => {
      res.json({ ok: true });
    });

    const server = await listen(app);
    const baseUrl = `http://127.0.0.1:${port(server)}`;

    try {
      const first = await fetch(`${baseUrl}/orders`, { method: "POST" });
      const second = await fetch(`${baseUrl}/orders`, { method: "POST" });
      const third = await fetch(`${baseUrl}/orders`, { method: "POST" });

      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.equal(third.status, 429);

      const body = (await third.json()) as { error?: string };
      assert.equal(body.error, RATE_LIMIT_ERROR_MESSAGE);
    } finally {
      await close(server);
    }
  });
});

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function port(server: Server): number {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected server to listen on a TCP port");
  }
  return address.port;
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
