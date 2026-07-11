import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertHealthPayloadSafe,
  buildFallbackHealthReport,
  buildPublicHealthResponse,
  buildSystemHealthReport,
  checkAuthHealth,
  checkBackgroundJobsHealth,
  checkEmailHealth,
  checkStripeHealth,
  checkStorageHealth,
  deriveOverallStatus,
  type ServiceHealth,
} from "./system-health";
import { recordApiError } from "./system-runtime-state";

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
    process.env.CLERK_SECRET_KEY = "clerk-secret-test";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_test_clerk";
    delete process.env.JOB_SECRET;

    const report = await buildSystemHealthReport({
      databasePing: async () => {},
      now: new Date("2026-06-24T12:00:00.000Z"),
    });

    assertHealthPayloadSafe(report);
    assert.ok(report.services.some((s) => s.name === "Database"));
    assert.ok(report.services.some((s) => s.name === "Background Jobs"));
    assert.equal(typeof report.application.apiVersion, "string");
    assert.equal(typeof report.application.startTime, "string");
    assert.ok(Array.isArray(report.apiErrors));
    assert.ok(Array.isArray(report.recentActivity));
    assert.ok(report.summary);
    assert.equal(typeof report.summary.apiErrorsLast24h, "number");
  });

  it("marks database failure as unavailable with overall error", async () => {
    process.env.CLERK_SECRET_KEY = "clerk-secret-test";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_test_clerk";

    const report = await buildSystemHealthReport({
      databasePing: async () => {
        throw new Error("connection refused");
      },
    });

    const db = report.services.find((s) => s.name === "Database");
    assert.equal(db?.status, "unavailable");
    assert.equal(report.status, "error");
    assertHealthPayloadSafe(report);
  });

  it("returns warning overall when optional services are not configured", async () => {
    delete process.env.JOB_SECRET;
    process.env.NODE_ENV = "development";
    process.env.MEDIA_STORAGE = "local";
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    process.env.CLERK_SECRET_KEY = "clerk-secret-test";
    process.env.CLERK_PUBLISHABLE_KEY = "pk_test_clerk";
    delete process.env.STRIPE_SECRET_KEY;

    const report = await buildSystemHealthReport({
      databasePing: async () => {},
    });

    assert.equal(report.status, "warning");
    assert.ok(report.services.some((s) => s.name === "Background Jobs" && s.status === "not_configured"));
  });

  it("includes recorded API errors", async () => {
    recordApiError({
      endpoint: "GET /api/example",
      httpStatus: 500,
      summary: "Example failure",
    });

    const report = await buildSystemHealthReport({ databasePing: async () => {} });
    assert.ok(report.apiErrors.some((entry) => entry.endpoint === "GET /api/example"));
  });
});

describe("buildFallbackHealthReport", () => {
  it("returns a warning report without throwing", () => {
    const report = buildFallbackHealthReport("partial failure");
    assert.equal(report.status, "warning");
    assert.ok(report.services.length > 0);
  });
});

describe("service health checks", () => {
  it("checkStripeHealth reports mode without exposing the key", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
    const health = await checkStripeHealth();
    assert.equal(health.metadata?.mode, "test");
    assert.equal(health.metadata?.billingConfigured, true);
    assertHealthPayloadSafe(health);
  });

  it("checkStorageHealth reports supabase metadata without secrets", async () => {
    process.env.MEDIA_STORAGE = "supabase";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_STORAGE_BUCKET = "media";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "secret-key-value";

    const health = await checkStorageHealth();
    assert.equal(health.status, "healthy");
    assert.equal(health.metadata?.bucket, "media");
    assertHealthPayloadSafe(health);
  });

  it("deriveOverallStatus treats optional not_configured as warning", () => {
    const services: ServiceHealth[] = [
      { name: "Database", status: "healthy", message: "ok" },
      { name: "Authentication", status: "healthy", message: "ok" },
      { name: "Email", status: "not_configured", message: "none" },
    ];
    assert.equal(deriveOverallStatus(services), "warning");
  });
});

describe("assertHealthPayloadSafe", () => {
  it("throws when a secret pattern is present", () => {
    assert.throws(() => assertHealthPayloadSafe({ key: "sk_test_leaked" }));
  });
});

describe("checkAuthHealth", () => {
  it("is unavailable when clerk keys are missing", async () => {
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_PUBLISHABLE_KEY;
    const health = await checkAuthHealth();
    assert.equal(health.status, "unavailable");
    assert.equal(health.name, "Authentication");
  });
});

describe("checkBackgroundJobsHealth", () => {
  it("reports not_configured when JOB_SECRET is missing in production", () => {
    delete process.env.JOB_SECRET;
    process.env.NODE_ENV = "production";
    const health = checkBackgroundJobsHealth();
    assert.equal(health.status, "not_configured");
    assert.equal(health.metadata?.jobSecretConfigured, false);
    assert.equal(health.metadata?.trialReminderEndpointAvailable, true);
    assertHealthPayloadSafe(health);
  });

  it("reports not_configured when JOB_SECRET is missing in development", () => {
    delete process.env.JOB_SECRET;
    process.env.NODE_ENV = "development";
    const health = checkBackgroundJobsHealth();
    assert.equal(health.status, "not_configured");
    assert.match(health.message, /normal for development/i);
  });
});

describe("checkEmailHealth", () => {
  it("is not_configured when email env is missing", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.RESEND_FROM;
    delete process.env.SMTP_FROM;
    assert.equal((await checkEmailHealth()).status, "not_configured");
  });
});
