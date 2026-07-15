# TownHub Frontend and Capacitor Guidance

These instructions refine the root `AGENTS.md` for the production React application and its Capacitor iOS shell. `artifacts/mockup-sandbox` is separate and is not a source for production behavior.

## Web application boundaries

- `src/pages` composes routes and workflows; `src/components` holds reusable UI; `src/hooks` owns shared React coordination; `src/lib` holds framework-light rules and provider helpers.
- Fetch server state through generated `@workspace/api-client-react` hooks/query keys when available. Keep Clerk bearer-token wiring in `App.tsx` and `lib/api-client-react/src/custom-fetch.ts`; do not create feature-specific API clients.
- Use `@/` imports inside this package and workspace imports for shared contracts. Preserve wouter `BASE_PATH`, lazy routes, TanStack Query cache ownership, existing layout/theme tokens, keyboard behavior, and mobile states.
- Cart state is localStorage-backed and single-business. Adding an item from another business must retain the explicit clear-cart confirmation.
- The API is authoritative for roles, ownership, plan access, availability, totals, and payment state. Frontend gates and disabled states explain server rules; they do not replace them.

## Checkout and protected customer flows

- Pay-at-pickup posts the order directly. Card checkout creates a pending intent, opens Stripe, confirms/materializes after payment, and carries the signed pending/order token through return and confirmation without logging it.
- Never create a success state solely from a Stripe browser redirect. Render loading, canceled, failed, expired-token, and delayed-webhook/confirmation states.
- Preserve pickup/delivery enablement, delivery address/minimum messaging, food-truck mobile ordering availability, and request-based appointment language.

## Shared web and iOS behavior

- Capacitor App Store builds package the responsive Vite application from `webDir` and call the selected remote API; do not set `server.url` or fork business features into native-only screens.
- All changes must work in ordinary browsers first and account for WKWebView safe areas, bottom tabs, dashboard back navigation, keyboard, and external links.
- Apple and Google OAuth: Apple stays in the WebView and returns via `capacitor://localhost/sso-callback`; Google uses Cap Browser + path-encoded `townhub://` bounce. Customer Stripe Checkout and Connect use the system browser; owner Stripe Billing actions are suppressed in store distributions.
- Preserve `VITE_PUBLIC_WEB_URL`/`APP_BASE_URL` callback alignment, the bundled `capacitor://localhost` origin, `native-sso-callback`, `native-checkout-return`, APNs registration, and authorized notification deep links.
- Do not edit copied `ios/App/App/public`, Pods, DerivedData, or generated Capacitor output. Change source/config, then use the sync scripts only when native configuration, plugins, or bundled assets are affected.

## Verification

```bash
pnpm --filter @workspace/townhub run typecheck
pnpm --filter @workspace/townhub run test
pnpm --filter @workspace/townhub run build
```

Visually verify meaningful UI changes in browser and mobile widths. For native-impacting work also run `pnpm --filter @workspace/townhub run ios:sync` and report whether Xcode, simulator, physical-device, OAuth, Stripe return, and push behavior were actually tested.
