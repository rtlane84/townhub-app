import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("admin system status UI", () => {
  it("renders operations center sections on system status page", () => {
    const systemStatus = readFileSync(
      join(root, "artifacts/townhub/src/pages/dashboard/admin/system-status.tsx"),
      "utf8",
    );
    const settings = readFileSync(
      join(root, "artifacts/townhub/src/pages/dashboard/admin/settings.tsx"),
      "utf8",
    );

    assert.match(systemStatus, /NotificationLogPanel/);
    assert.match(systemStatus, /Background Jobs/);
    assert.match(systemStatus, /RecentActivityPanel/);
    assert.match(systemStatus, /PlatformSummaryCards/);
    assert.match(systemStatus, /BusinessMetricsSection/);
    assert.match(systemStatus, /Platform Health/);
    assert.match(systemStatus, /Operational Logs/);
    assert.match(systemStatus, /Business Metrics/);
    assert.match(systemStatus, /handleAttentionAction/);
    assert.match(systemStatus, /Sentry/);
    assert.match(systemStatus, /healthUnavailable/);
    assert.doesNotMatch(systemStatus, /ApiErrorLogPanel/);
    assert.doesNotMatch(systemStatus, /api-error-log-panel/);
    assert.doesNotMatch(settings, /Notification History/);
    assert.doesNotMatch(settings, /useListNotificationLogs/);
  });
});

describe("admin system health API contract", () => {
  it("uses truthful service statuses and omits api error log fields", () => {
    const openapi = readFileSync(join(root, "lib/api-spec/openapi.yaml"), "utf8");
    assert.match(
      openapi,
      /enum: \[healthy, configured, degraded, unavailable, not_configured\]/,
    );
    assert.match(openapi, /enum: \[healthy, warning, error\]/);
    assert.match(openapi, /PlatformHealthSummary/);
    assert.match(openapi, /PlatformMetrics/);
    assert.doesNotMatch(openapi, /ApiErrorLogEntry/);
    assert.doesNotMatch(openapi, /apiErrorsLast24h/);
    assert.doesNotMatch(openapi, /apiErrors:/);
  });
});
