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
const tabBarSource = readFileSync(
  `${srcRoot}/components/native-bottom-tab-bar.tsx`,
  "utf8",
);
const nativeAwareSignInSource = readFileSync(
  `${srcRoot}/components/native-aware-sign-in.tsx`,
  "utf8",
);
const accountSource = readFileSync(`${srcRoot}/pages/account.tsx`, "utf8");
const iosRoot = fileURLToPath(new URL("../../ios/App/App/", import.meta.url));
const privacyManifest = readFileSync(`${iosRoot}/PrivacyInfo.xcprivacy`, "utf8");
const entitlements = readFileSync(`${iosRoot}/App.entitlements`, "utf8");

describe("App Store compliance wiring", () => {
  it("offers Apple as an equivalent native social login", () => {
    assert.match(socialSource, /Continue with Apple/);
    assert.match(socialSource, /oauth_token_apple/);
    assert.match(socialSource, /AuthSession\.appleSignIn/);
    assert.match(socialSource, /Continue with Google/);
    assert.match(socialSource, /authenticateWithGoogleOneTap/);
    assert.match(socialSource, /AuthSession\.googleSignIn/);
    assert.match(entitlements, /com\.apple\.developer\.applesignin/);
  });

  it("routes native email sign-in to the in-app sign-in page", () => {
    assert.match(tabBarSource, /href="\/sign-in"/);
    assert.match(tabBarSource, /Sign In with email/);
    assert.doesNotMatch(tabBarSource, /SignInButton mode=/);
    assert.match(nativeAwareSignInSource, /setLocation\("\/sign-in"\)/);
    // Native branch navigates; web branch may still use Clerk modal.
    assert.match(
      nativeAwareSignInSource,
      /if \(native\) \{[\s\S]*setLocation\("\/sign-in"\)[\s\S]*\}[\s\S]*SignInButton mode="modal"/,
    );
  });

  it("uses custom email forms on native sign-in/up (no Clerk prebuilt UI)", () => {
    assert.match(appSource, /NativeEmailSignInForm/);
    assert.match(appSource, /NativeEmailSignUpForm/);
    assert.match(
      appSource,
      /function SignInPage[\s\S]*native \? \(\s*<NativeEmailSignInForm/,
    );
    assert.match(
      appSource,
      /function SignUpPage[\s\S]*native \? \(\s*<NativeEmailSignUpForm/,
    );
    const emailAuth = readFileSync(
      `${srcRoot}/components/native-email-auth.tsx`,
      "utf8",
    );
    assert.match(emailAuth, /useSignIn/);
    assert.match(emailAuth, /useSignUp/);
    assert.match(emailAuth, /signIn\.create/);
    assert.match(emailAuth, /prepareEmailAddressVerification/);
    assert.doesNotMatch(emailAuth, /from "@clerk\/react"/);
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
