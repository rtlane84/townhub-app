---
name: Clerk proxy URL must be env var
description: The clerkProxyUrl in App.tsx must read from VITE_CLERK_PROXY_URL, not be hardcoded — hardcoding breaks the Replit preview
---

# Clerk proxyUrl must come from the env var

**Rule:** `const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;`

Never hardcode: `const clerkProxyUrl = \`${window.location.origin}/api/__clerk\`;`

**Why:** In the Replit dev preview, `VITE_CLERK_PROXY_URL` is intentionally empty. Clerk then loads its JS bundle directly from its own CDN. When the URL is hardcoded to `${window.location.origin}/api/__clerk`, Clerk tries to fetch `clerk.browser.js` through our Express server, which 404s — causing "Failed to load Clerk JS" and making auth completely non-functional in preview.

**How to apply:** Any time Clerk fails to load in the Replit preview with a 404 on `/api/__clerk/npm/@clerk/clerk-js...`, check App.tsx line where `clerkProxyUrl` is defined. It must be the env var, not a template literal.

In prod, Replit auto-populates `VITE_CLERK_PROXY_URL` with the correct value. No NODE_ENV gating needed.
