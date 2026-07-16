import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const card = readFileSync(
  join(root, "src/components/business-stripe-payments-card.tsx"),
  "utf8",
);
const banner = readFileSync(
  join(root, "src/components/stripe-connect-alert-banner.tsx"),
  "utf8",
);
const bounce = readFileSync(
  join(root, "public/native-stripe-connect-return/index.html"),
  "utf8",
);
const apiRoute = readFileSync(
  join(root, "../api-server/src/routes/stripe-connect.ts"),
  "utf8",
);

describe("Stripe Connect native return UX", () => {
  it("always exposes Refresh status and a Payments anchor", () => {
    assert.match(card, /button-refresh-stripe-status/);
    assert.match(card, /id="stripe-payments"/);
    assert.match(card, /browserFinished/);
    assert.match(card, /NATIVE_CONNECT_PENDING_KEY/);
  });

  it("banner opens Settings without Payments focus params", () => {
    assert.match(banner, /setLocation\("\/dashboard\/business\/settings"\)/);
    assert.doesNotMatch(banner, /stripeFocus/);
    assert.doesNotMatch(banner, /#stripe-payments/);
  });

  it("HTTPS bounce deep-links into Cap Settings", () => {
    assert.match(bounce, /townhub:\/\//);
    assert.match(bounce, /native-stripe-connect-return|dashboard\/business\/settings/);
    assert.match(apiRoute, /native-stripe-connect-return/);
  });
});
