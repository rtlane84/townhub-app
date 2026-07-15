import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const srcRoot = fileURLToPath(new URL("..", import.meta.url));
const appSource = readFileSync(`${srcRoot}/App.tsx`, "utf8");
const socialSource = readFileSync(
  `${srcRoot}/components/native-google-sign-in-button.tsx`,
  "utf8",
);
const accountSource = readFileSync(`${srcRoot}/pages/account.tsx`, "utf8");
const iosRoot = fileURLToPath(new URL("../../ios/App/App/", import.meta.url));
const privacyManifest = readFileSync(`${iosRoot}/PrivacyInfo.xcprivacy`, "utf8");
const entitlements = readFileSync(`${iosRoot}/App.entitlements`, "utf8");

describe("App Store compliance wiring", () => {
  it("offers Apple as an equivalent native social login", () => {
    assert.match(socialSource, /strategy="oauth_apple"/);
    assert.match(socialSource, /Continue with Apple/);
    assert.match(entitlements, /com\.apple\.developer\.applesignin/);
  });

  it("provides in-app account deletion and legal routes", () => {
    assert.match(appSource, /ProtectedRoute path="\/account"/);
    assert.match(appSource, /path="\/privacy-policy"/);
    assert.match(appSource, /path="\/terms-of-service"/);
    assert.match(accountSource, /Request account deletion/);
  });

  it("declares native privacy behavior without tracking", () => {
    assert.match(privacyManifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
    assert.match(privacyManifest, /NSPrivacyAccessedAPICategoryUserDefaults/);
    assert.match(privacyManifest, /NSPrivacyCollectedDataTypeDeviceID/);
    assert.match(privacyManifest, /NSPrivacyCollectedDataTypePhotosorVideos/);
  });
});
