import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("admin system status UI", () => {
  it("renders notification logs on system status instead of settings", () => {
    const systemStatus = readFileSync(
      join(root, "artifacts/local-order-hub/src/pages/dashboard/admin/system-status.tsx"),
      "utf8",
    );
    const settings = readFileSync(
      join(root, "artifacts/local-order-hub/src/pages/dashboard/admin/settings.tsx"),
      "utf8",
    );

    assert.match(systemStatus, /NotificationLogPanel/);
    assert.match(systemStatus, /Background Jobs/);
    assert.match(systemStatus, /ApiErrorLogPanel/);
    assert.match(systemStatus, /RecentActivityPanel/);
    assert.doesNotMatch(settings, /Notification History/);
    assert.doesNotMatch(settings, /useListNotificationLogs/);
  });
});

describe("admin system health API contract", () => {
  it("uses warning/error statuses instead of degraded/unhealthy", () => {
    const openapi = readFileSync(join(root, "lib/api-spec/openapi.yaml"), "utf8");
    assert.match(openapi, /enum: \[healthy, warning, unavailable, not_configured\]/);
    assert.match(openapi, /enum: \[healthy, warning, error\]/);
    assert.doesNotMatch(openapi, /enum: \[healthy, degraded, unhealthy/);
  });
});
