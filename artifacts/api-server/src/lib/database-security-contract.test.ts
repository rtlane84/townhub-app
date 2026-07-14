import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const schemaDirectory = fileURLToPath(
  new URL("../../../../lib/db/src/schema/", import.meta.url),
);

describe("database security contract", () => {
  it("enables RLS on every public application table", () => {
    const schemaSource = readdirSync(schemaDirectory)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(`${schemaDirectory}/${name}`, "utf8"))
      .join("\n");
    const tableCount = schemaSource.match(/\bpgTable\(/g)?.length ?? 0;
    const rlsCount = schemaSource.match(/\.enableRLS\(\)/g)?.length ?? 0;

    assert.ok(tableCount > 0);
    assert.equal(rlsCount, tableCount);
  });
});
