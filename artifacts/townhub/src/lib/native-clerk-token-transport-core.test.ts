import assert from "node:assert/strict";
import test from "node:test";
import {
  applyNativeClerkRequestAuth,
  rotatedClerkClientToken,
  type ClerkFapiRequest,
  type ClerkFapiResponse,
} from "./native-clerk-token-transport-core.ts";

test("native Clerk requests omit cookies and attach the saved client token", () => {
  const request: ClerkFapiRequest = {
    credentials: "include",
    headers: new Headers({ accept: "application/json" }),
    url: new URL("https://clerk.example/v1/client"),
  };

  applyNativeClerkRequestAuth(request, "Bearer client-token");

  assert.equal(request.credentials, "omit");
  assert.equal(request.url?.searchParams.get("_is_native"), "1");
  assert.equal(new Headers(request.headers).get("authorization"), "Bearer client-token");
  assert.equal(new Headers(request.headers).get("accept"), "application/json");
});

test("native Clerk requests remain unauthenticated when Keychain is empty", () => {
  const request: ClerkFapiRequest = {
    headers: new Headers(),
    url: new URL("https://clerk.example/v1/client"),
  };

  applyNativeClerkRequestAuth(request, null);

  assert.equal(request.credentials, "omit");
  assert.equal(new Headers(request.headers).has("authorization"), false);
});

test("rotatedClerkClientToken reads and trims Clerk's authorization header", () => {
  const response = new Response(null, {
    headers: { authorization: "  Bearer rotated-token  " },
  }) as ClerkFapiResponse;

  assert.equal(rotatedClerkClientToken(response), "Bearer rotated-token");
  assert.equal(rotatedClerkClientToken(undefined), null);
});
