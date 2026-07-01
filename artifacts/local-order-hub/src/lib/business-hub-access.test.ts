import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAccessBusinessHub, shouldShowListYourBusinessNav } from "./business-hub-access.ts";
import { resolveNavAuthState } from "./nav-auth-state.ts";

describe("business-hub-access", () => {
  it("allows hub access for admins and owners with active businesses only", () => {
    assert.equal(canAccessBusinessHub({ role: "ADMIN", activeBusinessCount: 0 }), true);
    assert.equal(canAccessBusinessHub({ role: "BUSINESS_OWNER", activeBusinessCount: 1 }), true);
    assert.equal(canAccessBusinessHub({ role: "BUSINESS_OWNER", activeBusinessCount: 0 }), false);
  });

  it("shows list-your-business nav for owners without active businesses", () => {
    assert.equal(
      shouldShowListYourBusinessNav({ isSignedIn: true, role: "BUSINESS_OWNER", activeBusinessCount: 0 }),
      true,
    );
    assert.equal(
      shouldShowListYourBusinessNav({ isSignedIn: true, role: "BUSINESS_OWNER", activeBusinessCount: 2 }),
      false,
    );
  });
});

describe("resolveNavAuthState business ownership", () => {
  it("hides Business Hub nav for owners without active businesses", () => {
    const state = resolveNavAuthState({
      clerkLoaded: true,
      isSignedIn: true,
      meLoading: false,
      role: "BUSINESS_OWNER",
      activeBusinessCount: 0,
    });
    assert.equal(state.showBusinessHubNav, false);
    assert.equal(state.showListYourBusinessNav, true);
  });

  it("shows Business Hub nav for owners with active businesses", () => {
    const state = resolveNavAuthState({
      clerkLoaded: true,
      isSignedIn: true,
      meLoading: false,
      role: "BUSINESS_OWNER",
      activeBusinessCount: 1,
    });
    assert.equal(state.showBusinessHubNav, true);
    assert.equal(state.showListYourBusinessNav, false);
  });
});
