import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessBusinessHub,
  shouldShowListYourBusinessNav,
  shouldShowMyOrdersNav,
} from "./business-hub-access.ts";
import { resolveNavAuthState } from "./nav-auth-state.ts";

describe("business-hub-access", () => {
  it("allows hub access for admins and owners with active businesses only", () => {
    assert.equal(canAccessBusinessHub({ role: "ADMIN", activeBusinessCount: 0 }), true);
    assert.equal(canAccessBusinessHub({ role: "BUSINESS_OWNER", activeBusinessCount: 1 }), true);
    assert.equal(canAccessBusinessHub({ role: "BUSINESS_OWNER", activeBusinessCount: 0 }), false);
  });

  it("shows list-your-business action for visitors and customers", () => {
    assert.equal(
      shouldShowListYourBusinessNav({ isSignedIn: false, role: undefined, activeBusinessCount: 0 }),
      true,
    );
    assert.equal(
      shouldShowListYourBusinessNav({ isSignedIn: true, role: "CUSTOMER", activeBusinessCount: 0 }),
      true,
    );
    assert.equal(
      shouldShowListYourBusinessNav({ isSignedIn: true, role: "BUSINESS_OWNER", activeBusinessCount: 0 }),
      false,
    );
    assert.equal(
      shouldShowListYourBusinessNav({ isSignedIn: true, role: "BUSINESS_OWNER", activeBusinessCount: 2 }),
      false,
    );
    assert.equal(
      shouldShowListYourBusinessNav({ isSignedIn: true, role: "ADMIN", activeBusinessCount: 0 }),
      false,
    );
  });

  it("shows my orders for customers and business owners only", () => {
    assert.equal(shouldShowMyOrdersNav({ isSignedIn: false, role: undefined }), false);
    assert.equal(shouldShowMyOrdersNav({ isSignedIn: true, role: "CUSTOMER" }), true);
    assert.equal(shouldShowMyOrdersNav({ isSignedIn: true, role: "BUSINESS_OWNER" }), true);
    assert.equal(shouldShowMyOrdersNav({ isSignedIn: true, role: "ADMIN" }), false);
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
    assert.equal(state.showListYourBusinessNav, false);
    assert.equal(state.showMyOrdersNav, true);
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
    assert.equal(state.showMyOrdersNav, true);
  });
});
