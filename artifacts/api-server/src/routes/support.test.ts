import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SubmitSupportReportBody } from "@workspace/api-zod";
import { isWriteLimitedRoute } from "../lib/rate-limit-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("support report API contract", () => {
  it("validates required fields and rejects empty messages", () => {
    assert.equal(
      SubmitSupportReportBody.safeParse({
        category: "BUG",
        message: "Broken map pin",
        pagePath: "/food-trucks",
      }).success,
      true,
    );
    assert.equal(
      SubmitSupportReportBody.safeParse({
        category: "BUG",
        message: "",
        pagePath: "/food-trucks",
      }).success,
      false,
    );
    assert.equal(
      SubmitSupportReportBody.safeParse({
        category: "NOPE",
        message: "x",
        pagePath: "/",
      }).success,
      false,
    );
  });

  it("rate-limits POST /support/reports as a public write", () => {
    assert.equal(isWriteLimitedRoute("/support/reports", "POST"), true);
    assert.equal(isWriteLimitedRoute("/support/reports", "GET"), false);
  });

  it("wires public route through deliverSupportReport without logging PII fields", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "support.ts"),
      "utf8",
    );
    assert.match(source, /SubmitSupportReportBody/);
    assert.match(source, /deliverSupportReport/);
    assert.match(source, /getAuth/);
    assert.doesNotMatch(source, /logger\.(info|error|warn).*message/);
    assert.doesNotMatch(source, /logger\.(info|error|warn).*contactEmail/);
  });

  it("mounts the support router", () => {
    const indexSource = fs.readFileSync(
      path.resolve(__dirname, "index.ts"),
      "utf8",
    );
    assert.match(indexSource, /supportRouter/);
  });
});
