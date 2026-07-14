import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const srcRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const routeSource = readFileSync(`${srcRoot}/routes/auth.ts`, "utf8");
const schemaSource = readFileSync(
  `${repoRoot}/lib/db/src/schema/account-deletion-requests.ts`,
  "utf8",
);
const openApiSource = readFileSync(`${repoRoot}/lib/api-spec/openapi.yaml`, "utf8");

describe("account deletion contract", () => {
  it("requires authentication and explicit confirmation", () => {
    assert.match(routeSource, /getAuth\(req\)/);
    assert.match(routeSource, /RequestMyAccountDeletionBody\.safeParse\(req\.body\)/);
    assert.match(openApiSource, /enum: \[DELETE\]/);
  });

  it("stores one auditable request per user with a processing date", () => {
    assert.match(schemaSource, /account_deletion_requests_user_id_unique/);
    assert.match(schemaSource, /scheduledFor: timestamp/);
    assert.match(schemaSource, /emailSnapshot: text/);
  });

  it("keeps the operational queue admin-only", () => {
    assert.match(routeSource, /\/admin\/account-deletion-requests/);
    assert.match(openApiSource, /listAccountDeletionRequests/);
  });
});
