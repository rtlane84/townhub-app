import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertHealthPayloadSafe,
  buildPublicHealthResponse,
  buildSystemHealthReport,
  checkAuthHealth,
  checkEmailHealth,
  checkStripeHealth,
  checkStorageHealth,
  deriveOverallStatus,
  type ServiceHealth,
} from "./system-health";

describe("buildPublicHealthResponse", () => {
  it("returns minimal safe fields only", () => {
    const now = new Date("2026-06-24T12:00:00.000Z");
    const response = buildPublicHealthResponse(now);

    assert.deepEqual(Object.keys(response).sort(), ["status", "timestamp", "uptimeSeconds"]);
    assert.equal(response.status, "ok");
    assert.equal(response.timestamp, now.toISOString());
    assertHealthPayloadSafe(response);
  });
});

describe("buildSystemHealthReport", () => {
  it("does not expose secrets in the detailed response", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example_key_should_not_appear";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "super-secret-service-role";
    process.env.DATABASE_URL = "postgres://user:pass@localhost/db";

    const report = await buildSystemHealthReport({
      databasePing: async () => {},
      now: new Date("2026-06-24T12:00:00.000Z"),
    });

    assertHealthPayloadSafe(report);
    assert.ok(report.services.some((s) => s.name === "Database"));
    assert.ok(report.application.name);
    assert.equal(typeof report.application.uptimeSeconds, "number");
  });

  it("marks database failure as unhealthy", async () => {
    const report = await buildSystemHealthReport({
      databasePing: async () => {
        throw new Error("connection refused");
      },
    });

    const db = report.services.find((s) => s.name === "Database");
    assert.equal(db?.status, "unhealthy");
    assert.equal(report.status, "unhealthy");
    assertHealthPayloadSafe(report);
  });
});

describe("service health checks", () => {
  it("checkStripeHealth reports mode without exposing the key", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
    const health = checkStripeHealth();
    assert.equal(health.metadata?.mode, "test");
    assertHealthPayloadSafe(health);
  });

  it("checkStorageHealth reports supabase metadata without secrets", () => {
    process.env.MEDIA_STORAGE = "supabase";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_STORAGE_BUCKET = "media";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret-key-value";

    const health = checkStorageHealth();
    assert.equal(health.status, "healthy");
    assert.equal(health.metadata?.bucket, "media");
    assertHealthPayloadSafe(health);
  });

  it("deriveOverallStatus treats optional not_configured as degraded", () => {
    const services: ServiceHealth[] = [
      { name: "Database", status: "healthy", message: "ok" },
      { name: "Auth", status: "healthy", message: "ok" },
      { name: "Email", status: "not_configured", message: "none" },
    ];
    assert.equal(deriveOverallStatus(services), "degraded");
  });
});

describe("assertHealthPayloadSafe", () => {
  it("throws when a secret pattern is present", () => {
    assert.throws(() => assertHealthPayloadSafe({ key: "sk_test_leaked" }));
  });
});

describe("checkAuthHealth", () => {
  it("is unhealthy when clerk keys are missing", () => {
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_PUBLISHABLE_KEY;
    const health = checkAuthHealth();
    assert.equal(health.status, "unhealthy");
  });
});

describe("checkEmailHealth", () => {
  it("is not_configured when email env is missing", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.RESEND_FROM;
    delete process.env.SMTP_FROM;
    assert.equal(checkEmailHealth().status, "not_configured");
  });
});
