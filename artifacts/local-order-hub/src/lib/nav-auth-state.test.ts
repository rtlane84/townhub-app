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
  });

  it("resolves signed-out nav after Clerk loads", () => {
    const state = resolveNavAuthState({
      clerkLoaded: true,
      isSignedIn: false,
      meLoading: false,
    });
    assert.equal(state.isLoggedOut, true);
    assert.equal(state.isCustomer, false);
  });
});
