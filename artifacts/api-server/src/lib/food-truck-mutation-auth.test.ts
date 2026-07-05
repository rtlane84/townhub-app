import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authorizeFoodTruckLocationMutation } from "./food-truck-mutation-auth";

const ownerAccess = { ok: true as const, business: {} as never, isAdmin: false };
const adminAccess = { ok: true as const, business: {} as never, isAdmin: true };
const forbiddenAccess = {
  ok: false as const,
  status: 403,
  error: "Forbidden: business owner access required",
};
const unauthorizedAccess = {
  ok: false as const,
  status: 401,
  error: "Unauthorized",
};

describe("authorizeFoodTruckLocationMutation", () => {
  it("rejects unauthenticated mutations", () => {
    const result = authorizeFoodTruckLocationMutation({
      isAuthenticated: false,
      businessAccess: unauthorizedAccess,
      requestedBusinessId: 1,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 401);
  });

  it("rejects authenticated non-owner mutations", () => {
    const result = authorizeFoodTruckLocationMutation({
      isAuthenticated: true,
      businessAccess: forbiddenAccess,
      requestedBusinessId: 1,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 403);
  });

  it("allows owners to create locations for their business", () => {
    const result = authorizeFoodTruckLocationMutation({
      isAuthenticated: true,
      businessAccess: ownerAccess,
      requestedBusinessId: 1,
    });
    assert.equal(result.ok, true);
  });

  it("allows admins to mutate any business locations", () => {
    const result = authorizeFoodTruckLocationMutation({
      isAuthenticated: true,
      businessAccess: adminAccess,
      requestedBusinessId: 99,
    });
    assert.equal(result.ok, true);
  });

  it("rejects PUT/DELETE when the location does not exist", () => {
    const result = authorizeFoodTruckLocationMutation({
      isAuthenticated: true,
      businessAccess: ownerAccess,
      requestedBusinessId: 1,
      existingLocation: null,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 404);
  });

  it("rejects PUT/DELETE when the location belongs to another business", () => {
    const result = authorizeFoodTruckLocationMutation({
      isAuthenticated: true,
      businessAccess: ownerAccess,
      requestedBusinessId: 1,
      existingLocation: { businessId: 2 },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 404);
      assert.equal(result.error, "Location not found");
    }
  });

  it("allows PUT/DELETE when the location belongs to the requested business", () => {
    const result = authorizeFoodTruckLocationMutation({
      isAuthenticated: true,
      businessAccess: ownerAccess,
      requestedBusinessId: 1,
      existingLocation: { businessId: 1 },
    });
    assert.equal(result.ok, true);
  });
});
