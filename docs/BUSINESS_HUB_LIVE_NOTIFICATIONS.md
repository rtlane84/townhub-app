# Business Hub live notifications (in-browser)

This document describes **dashboard-only** alerts shown while a business owner or admin has **Business Hub** open in the browser: live data refresh, toasts, optional sound, and persistent banners.

It does **not** cover server-delivered channels (email, SMS, ntfy, Discord, etc.). Those fire regardless of whether the dashboard is open. See [NOTIFICATIONS.md](./NOTIFICATIONS.md) for the full owner notification stack.

For SSE transport and the API event bus, see [ARCHITECTURE.md](./ARCHITECTURE.md#business-hub-live-updates-sse).

---

## What this is for

When someone is actively working in Business Hub, TownHub:

1. **Pushes list updates** over Server-Sent Events (SSE) on key pages so orders and appointments appear without manual refresh.
2. **Shows a short in-app toast** (and plays a sound if enabled) when a new order or appointment request arrives.
3. **Shows a persistent banner** on catalog/configuration pages where the owner is not already looking at a live queue.

These are **complementary** to email/SMS/ntfy/Discord. They do not replace them.

---

## Requirements (when it works)

| Requirement | Detail |
| ----------- | ------ |
| Signed in | Clerk session; owner or admin of the business |
| Business Hub open | A browser tab must have TownHub loaded on a Business Hub route (`/dashboard/business/...`) |
| Correct business selected | The dashboard business switcher must match the business that received the order or appointment |
| Browser support | Modern browser with `fetch` + streaming (all supported desktop/mobile browsers) |

### Tab, window, and visibility

- **Another tab in the same browser:** Works. Each Business Hub tab maintains its own live connection or polling loop for the selected business.
- **Another window (same browser profile):** Works the same as another tab.
- **Business Hub completely closed:** In-browser toasts, banners, and live refresh **do not run**. Use email, SMS, ntfy, Discord, or browser/system notifications configured under **Business Hub → Notifications**.
- **Tab in the background (another app or tab focused):**
  - **SSE (live pages):** The connection stays open; updates and toasts can still arrive while the tab is hidden.
  - **Polling (non-live pages or SSE fallback):** Polling **pauses** while `document.hidden` is true. When you return to the tab, the next poll runs immediately, then every ~12 seconds.
- **Computer asleep / browser throttled:** Connections may drop; the UI shows **Reconnecting** or **Polling** and recovers when the tab is active again.

---

## How updates reach the dashboard

```text
Order or appointment changes on server
        │
        ├─► Server channels (always, if enabled)
        │     email · SMS · ntfy · Discord · …
        │
        └─► Business Hub (only while dashboard tab is open)
                │
                ├─ Live pages ──► SSE stream (primary)
                │                  GET /api/businesses/:id/live-events
                │
                └─ Other pages ──► HTTP polling (~12s)
                     or live pages when SSE fails (fallback)
```

### Live pages (SSE connected)

SSE is active only on:

| Page | Path |
| ---- | ---- |
| Overview | `/dashboard/business` |
| Orders | `/dashboard/business/orders` (+ order detail URLs under this path) |
| Kitchen | `/dashboard/business/kitchen` |
| Appointments | `/dashboard/business/appointments` |

On these pages a small status indicator appears (sidebar on desktop, top bar on mobile):

| Indicator | Meaning |
| --------- | ------- |
| **Live** | SSE connected; near real-time updates |
| **Reconnecting…** | Temporary disconnect; retrying with backoff |
| **Polling** | SSE unavailable; using HTTP polling fallback |
| **Offline** | Not connected (e.g. signed out or no business selected) |

### Non-live pages (polling only)

On catalog and configuration pages, SSE is **not** opened. The dashboard polls the API about every **12 seconds** instead:

- Items, Categories, Item Options  
- Settings, Notifications, Subscription  
- Locations  
- Any other Business Hub route not listed as a live page above  

Polling uses the same alert logic as SSE but with a short delay. Polling pauses while the tab is hidden.

### SSE fallback on live pages

If SSE cannot connect (auth error, proxy buffering, repeated failures), live pages automatically switch to the same ~12s polling loop. The indicator shows **Polling**.

---

## Toast notifications (all Business Hub pages)

When a **new order** or **new customer appointment request** is detected:

- A **brief toast** appears (~6 seconds).
- **Sound** plays if enabled in per-business notification preferences (same sound settings as before).
- Toast is **actionable**:
  - **New order:** title like `🍔 New Order #109`, customer name, pickup/delivery and total; **Open Order** button.
  - Clicking the toast body or **Open Order** navigates to the order detail page.
  - Multiple orders at once: one toast summarizing the count with **View Orders**.

Toasts appear on **every** Business Hub page (live and non-live).

---

## Persistent banners (non-live pages only)

On pages where you are **not** already viewing a live order or appointment queue, a **banner** stays at the top of the main content until you act on it:

| Page type | Order banner | Appointment banner |
| --------- | ------------ | ------------------ |
| Overview, Orders, Kitchen | No (data already visible) | No on Appointments only |
| Appointments | Yes (orders are not live on this page) | No |
| Settings, Items, Categories, etc. | Yes | Yes (if appointments enabled) |

Banner behavior:

- **One banner at a time** per type (orders vs appointments).
- **Single new order:** `🔔 New Order #109` with details, **Open Order**, **Dismiss**.
- **Multiple new orders:** `3 New Orders Waiting` with **View Orders**, **Dismiss** (no stacking spam).
- Survives navigation within Business Hub until dismissed or you open the order(s).
- Same pattern for appointment requests on non-live pages.

---

## Behavior summary by screen

### Orders

| Screen | List updates | Toast | Banner |
| ------ | ------------ | ----- | ------ |
| Kitchen | Instant (SSE) | Yes | No |
| Overview | Instant (SSE) | Yes | No |
| Orders | Instant (SSE) | Yes | No |
| Settings / Items / … | ~12s poll | Yes | Yes |

### Appointments

| Screen | List updates | Toast | Banner |
| ------ | ------------ | ----- | ------ |
| Appointments | Instant (SSE) | Yes | No |
| Settings / Items / … | ~12s poll | Yes | Yes |

---

## Owner settings that apply

Configured under **Business Hub → Notifications** (and related settings). Live dashboard alerts respect:

| Setting | Effect on live dashboard |
| ------- | ------------------------ |
| Sound enabled | Toast may play the selected notification sound |
| Sound volume | Loudness of in-browser sound |
| Email / SMS / ntfy / Discord toggles | **Unchanged** — server delivery is independent of dashboard |

Browser/desktop notifications (if configured separately) are also independent of this SSE/toast/banner system.

---

## What this does not do

- Does not notify owners who do not have Business Hub open in a browser tab.
- Does not send data to customers.
- Does not include customer PII in the SSE payload (only ids and status for cache refresh).
- Does not work across multiple API server instances without a shared event bus in production (see [OPERATIONS.md](./OPERATIONS.md#business-hub-live-updates-sse)); beta single-instance deployments are fully supported.

---

## Quick troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| No toast anywhere | Business Hub not open, wrong business selected, or not signed in as owner/admin |
| Works on Kitchen, not Settings | Expected delay on Settings (~12s poll); wait or switch to a live page |
| Indicator stuck on **Polling** | SSE blocked (proxy, auth); polling fallback is active — updates still arrive, slower |
| Nothing while tab in background on Settings | Polling pauses when hidden; focus the tab or use a live page for SSE |
| Email/SMS arrived but no toast | Normal if dashboard was closed; server channels do not require an open tab |

---

## Related docs

- [NOTIFICATIONS.md](./NOTIFICATIONS.md) — email, SMS, and server-side owner alerts  
- [ARCHITECTURE.md](./ARCHITECTURE.md#business-hub-live-updates-sse) — SSE endpoint and event bus  
- [OPERATIONS.md](./OPERATIONS.md#business-hub-live-updates-sse) — deployment and multi-instance notes  
