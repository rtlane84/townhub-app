---
name: Clerk proxy setup for Replit
description: How Clerk auth is wired in this Express app for custom-domain proxy support
---

## Rule
The Clerk proxy middleware (`clerkProxyMiddleware`) must be mounted on `/api/__clerk` BEFORE `express.json()` and other body parsers. Use `publishableKeyFromHost` with `getClerkProxyHost(req)` in the `clerkMiddleware` callback so the right publishable key is selected for the incoming host.

**Why:** Clerk's FAPI proxy requires raw body access. Placing it after body parsers breaks the proxy. `publishableKeyFromHost` handles multi-domain deployments (dev vs production Replit domains) automatically.

**How to apply:** See `artifacts/api-server/src/app.ts` — proxy route registered before CORS and body parsing middleware.
