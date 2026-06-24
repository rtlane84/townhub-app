---
name: Replit iframe Clerk auth workaround
description: Why Clerk session cookies fail in Replit preview and how the Bearer token bridge fixes it
---

# Replit iframe Clerk auth — SameSite cookie block

## The rule
Web apps running in the Replit preview iframe MUST use `Authorization: Bearer` token auth, not cookie auth, for API calls. Cookies work in the published app but not in the preview.

## Why
The Replit preview embeds the app in an iframe whose top-level origin is `replit.com`. The app is on `janeway.replit.dev`. Browsers apply SameSite=Lax to Clerk's session cookies (`__session`, `__clerk_db_jwt`), which means those cookies are stripped from every fetch request made from the iframe — even though the request is same-origin to the iframe itself. The server receives requests with zero cookies, zero auth headers, and returns `X-Clerk-Auth-Reason: dev-browser-missing`.

## How to apply
Two changes together:

**1. `lib/api-client-react/src/custom-fetch.ts`** — Add `credentials: 'include'` to the fetch call:
```ts
const response = await fetch(input, { credentials: "include", ...init, method, headers });
```
(Helps for cookie auth when the browser allows it; harmless otherwise.)

**2. `artifacts/local-order-hub/src/App.tsx`** — Mount `ClerkApiTokenBridge` inside `<QueryClientProvider>`:
```tsx
import { useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

function ClerkApiTokenBridge() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);
  return null;
}
// Mount it: <ClerkApiTokenBridge /> alongside <ClerkQueryClientCacheInvalidator />
```

The `setAuthTokenGetter` callback is called before every API request in `customFetch`; it returns the short-lived Clerk JWT which is attached as `Authorization: Bearer <token>`. The server's `@clerk/express` middleware accepts both cookie and bearer token auth.

## Diagnostic signature
When cookies are the only auth mechanism and this bug is present, the API server logs show:
- `cookieKeys: []`, `hasAuthHeader: false` on every auth-gated request
- HTTP response header: `X-Clerk-Auth-Reason: dev-browser-missing`
