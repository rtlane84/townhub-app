import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("application submitted admin notification wiring", () => {
  it("notifies admins when an application is submitted", () => {
    const applicationsRoute = readFileSync(
      join(root, "artifacts/api-server/src/routes/applications.ts"),
      "utf8",
    );
    assert.match(applicationsRoute, /notifyBusinessApplicationSubmitted/);
    assert.match(applicationsRoute, /notifyBusinessApplicationRejected/);
    assert.match(applicationsRoute, /Application submitted admin notification failed/);
    assert.match(applicationsRoute, /Application rejected owner notification failed/);
  });
});
