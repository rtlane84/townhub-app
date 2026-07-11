import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const internalJobsSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "internal-jobs.ts"),
  "utf8",
);

describe("internal jobs routing", () => {
  it("scopes JOB_SECRET middleware to the job route only", () => {
    assert.doesNotMatch(internalJobsSource, /router\.use\(requireJobSecret\)/);
    assert.match(internalJobsSource, /router\.post\([\s\S]*requireJobSecret/);
  });
});
