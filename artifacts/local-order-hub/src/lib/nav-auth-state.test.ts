import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveNavAuthState } from "./nav-auth-state.ts";

describe("resolveNavAuthState", () => {
  it("shows public nav only while Clerk is loading", () => {
    const state = resolveNavAuthState({
      clerkLoaded: false,
      isSignedIn: false,
      meLoading: false,
    });
    assert.equal(state.authResolved, false);
    assert.equal(state.showPublicNavOnly, true);
    assert.equal(state.isLoggedOut, false);
    assert.equal(state.showMyOrdersNav, false);
    assert.equal(state.showListYourBusinessNav, false);
  });

  it("shows public nav only while signed-in profile is loading", () => {
    const state = resolveNavAuthState({
      clerkLoaded: true,
      isSignedIn: true,
      meLoading: true,
      role: "ADMIN",
    });
    assert.equal(state.authResolved, false);
    assert.equal(state.showPublicNavOnly, true);
    assert.equal(state.isAdmin, false);
  });

  it("resolves admin nav after profile loads", () => {
    const state = resolveNavAuthState({
      clerkLoaded: true,
      isSignedIn: true,
      meLoading: false,
      role: "ADMIN",
    });
    assert.equal(state.isAdmin, true);
    assert.equal(state.isCustomer, false);
    assert.equal(state.showPublicNavOnly, false);
    assert.equal(state.showBusinessHubNav, true);
    assert.equal(state.showMyOrdersNav, false);
    assert.equal(state.showListYourBusinessNav, false);
  });

  it("resolves signed-out nav after Clerk loads", () => {
    const state = resolveNavAuthState({
      clerkLoaded: true,
      isSignedIn: false,
      meLoading: false,
    });
    assert.equal(state.isLoggedOut, true);
    assert.equal(state.isCustomer, false);
    assert.equal(state.showListYourBusinessNav, true);
    assert.equal(state.showMyOrdersNav, false);
  });

  it("shows my orders and list-your-business action for customers", () => {
    const state = resolveNavAuthState({
      clerkLoaded: true,
      isSignedIn: true,
      meLoading: false,
      role: "CUSTOMER",
    });
    assert.equal(state.isCustomer, true);
    assert.equal(state.showMyOrdersNav, true);
    assert.equal(state.showBusinessHubNav, false);
    assert.equal(state.showListYourBusinessNav, true);
  });

  it("shows my orders and business hub for owners with active businesses", () => {
    const state = resolveNavAuthState({
      clerkLoaded: true,
      isSignedIn: true,
      meLoading: false,
      role: "BUSINESS_OWNER",
      activeBusinessCount: 2,
    });
    assert.equal(state.showMyOrdersNav, true);
    assert.equal(state.showBusinessHubNav, true);
    assert.equal(state.showListYourBusinessNav, false);
  });

  it("shows my orders but not list-your-business for owners awaiting approval", () => {
    const state = resolveNavAuthState({
      clerkLoaded: true,
      isSignedIn: true,
      meLoading: false,
      role: "BUSINESS_OWNER",
      activeBusinessCount: 0,
    });
    assert.equal(state.showMyOrdersNav, true);
    assert.equal(state.showBusinessHubNav, false);
    assert.equal(state.showListYourBusinessNav, false);
  });
});
