import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const ordersSchemaSource = readFileSync(
  `${repoRoot}/lib/db/src/schema/orders.ts`,
  "utf8",
);

describe("payment schema contract", () => {
  it("keeps Stripe Checkout order materialization idempotent", () => {
    assert.match(ordersSchemaSource, /orders_stripe_session_id_uidx/);
    assert.match(ordersSchemaSource, /stripeSessionId.*is not null/);
  });
});
