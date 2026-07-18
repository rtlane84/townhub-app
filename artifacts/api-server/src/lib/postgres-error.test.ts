import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasDatabaseErrorCode, isPostgresUniqueViolation } from "./postgres-error";

describe("database error codes", () => {
  it("recognizes direct PostgreSQL unique violations", () => {
    assert.equal(isPostgresUniqueViolation({ code: "23505" }), true);
  });

  it("recognizes unique violations wrapped by query libraries", () => {
    const error = new Error("Failed query", {
      cause: new Error("duplicate key", { cause: { code: "23505" } }),
    });

    assert.equal(isPostgresUniqueViolation(error), true);
  });

  it("rejects unrelated and cyclic error causes", () => {
    const cyclic: { code: string; cause?: unknown } = { code: "XX000" };
    cyclic.cause = cyclic;

    assert.equal(isPostgresUniqueViolation({ code: "23503" }), false);
    assert.equal(hasDatabaseErrorCode(cyclic, "23505"), false);
  });
});
