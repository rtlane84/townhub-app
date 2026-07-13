# Shared Web and Capacitor Frontend

## Status

Accepted

## Context

TownHub serves public marketplace, customer, Business Hub, and admin workflows from `artifacts/townhub`, a responsive React/Vite application. The iOS project under `artifacts/townhub/ios` is a Capacitor shell configured to load the deployed frontend. Maintaining a second native implementation would split behavior and exceed the beta scope.

## Decision

Use one responsive web application for browser and iOS experiences. Keep commerce and dashboard behavior in React. Add native-aware adapters only for capabilities that require the shell: safe areas/navigation, splash and status bar, system-browser OAuth and Stripe handoff, deep links, haptics, and APNs registration.

## Consequences

- Web behavior remains the baseline and ships to iOS without feature duplication.
- Native changes must preserve browser compatibility and deployed-URL alignment.
- OAuth, external checkout returns, deep links, and push need explicit web-plus-iOS verification.
- The shell depends on the availability and compatibility of the deployed frontend.
