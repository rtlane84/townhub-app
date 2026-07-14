import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

describe("food-truck civil today", () => {
  it("uses platform timezone civil dates instead of UTC ISO slices", () => {
    const foodTruck = readFileSync(
      join(here, "../routes/food-truck.ts"),
      "utf8",
    );
    assert.match(
      foodTruck,
      /formatCivilDateInTimeZone\(new Date\(\), timeZone\)/,
    );
    assert.match(foodTruck, /addCivilDays\(today, 30\)/);
    assert.doesNotMatch(foodTruck, /toISOString\(\)\.slice\(0,\s*10\)/);
  });
});
