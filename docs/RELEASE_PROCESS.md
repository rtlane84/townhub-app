# TownHub live release process (web + iOS)

Day-to-day runbook after staging and production are live. For environment isolation see [ENVIRONMENTS.md](./ENVIRONMENTS.md). For go-live gates see [../PRODUCTION.md](../PRODUCTION.md). For Capacitor details and the physical-device matrix see [IOS_APP.md](./IOS_APP.md).

## Mental model

TownHub has **three surfaces** that update differently:

| Surface | How users get updates | Trigger |
|---|---|---|
| Staging web + API | Instantly when you merge to `develop` | Cloudflare + Railway auto-deploy |
| Production web + API | Instantly when you merge to `main` | Cloudflare + Railway auto-deploy |
| iOS (TestFlight / App Store) | Only when you archive and upload a new IPA | Manual: prepare → bump → Xcode Archive → App Store Connect |

The iOS app embeds a snapshot of the React UI at `ios:sync` time. A GitHub push or website deploy **never** updates what is already installed on a phone. “Ship to web” and “ship to phones” are separate steps.

| Git branch | API | Frontend |
|---|---|---|
| `develop` | `api-staging.townhub.io` | `staging.townhub.io` |
| `main` | `api.townhub.io` | `townhub.io` |

## Default day-to-day flow

1. Branch from `develop`: `git checkout develop && git pull && git checkout -b fix/…` (or `feat/…`).
2. Build and test locally.
3. Open a PR → `develop`. After merge, wait for the staging deploy and smoke the changed flow on [staging.townhub.io](https://staging.townhub.io).
4. Decide whether phones need the change (see [When you need a new iOS build](#when-you-need-a-new-ios-build)).
   - **No** → go to step 5.
   - **Yes** → cut a **staging TestFlight** from that commit (see [Staging TestFlight](#staging-testflight)), then continue.
5. Promote with a PR `develop` → `main` (short what / why / smoke-done note). After merge, smoke [townhub.io](https://townhub.io).
6. Tag the production commit when cutting a named release:

   ```bash
   git tag -a v1.0.1 -m "Release 1.0.1"
   git push origin v1.0.1
   ```

7. If phones need the production build, prepare a **production** iOS archive from that same tagged commit and submit (see [App Store candidate](#app-store-candidate)). Never upload a staging-API binary as the store build.

Do not push straight to `main` except emergencies. After a hotfix on `main`, merge `main` back into `develop` the same day so staging does not drift.

### Cadence

- Merge to `develop` often; staging is the sandbox.
- Promote `develop` → `main` in batches when staging is green (end of day or a coherent set of fixes), not every tiny PR unless urgent.
- Cut TestFlight whenever phone-facing work is ready to validate—not necessarily on every promote.
- Ship App Store less often: when you have a coherent marketing version, or a pilot blocker needs phones updated.

## Common scenarios

### A — API-only fix

Example: server-side order status bug, no UI change.

```
feature → PR develop → smoke staging → PR main → done
```

No TestFlight. No App Store. Installed apps keep talking to the API; server behavior improves without a new IPA.

### B — UI / copy / frontend fix

Example: checkout button, Help text, or any change under `artifacts/townhub` that users see.

```
feature → PR develop → smoke staging.townhub.io
       → staging TestFlight
       → PR main → smoke townhub.io
       → production iOS prepare + Archive → App Store
```

Web users get the change from the merge. Phone users only get it after a new IPA.

### C — Native-only change

Example: Sign in with Apple entitlement, push plugin, Google client IDs in `.env.native.*`.

```
feature → PR develop
       → staging TestFlight required
       → PR main
       → production iOS Archive required
```

Promote the same commit even if the website looks unchanged so web and native stay on one SHA.

### Hotfix on `main`

1. Branch from `main`, fix, PR → `main` (or emergency direct push only if unavoidable).
2. Smoke production.
3. Merge `main` into `develop` immediately.
4. If the fix is phone-facing, cut a production iOS build from the hotfix commit (and a staging TestFlight from the merged `develop` when convenient).

## When you need a new iOS build

Ask: **Would a phone user miss this change if they never install a new app?**

If yes → new IPA. If no → web/API deploy is enough.

| Change type | Web/API deploy enough? | New TestFlight / App Store build? |
|---|---|---|
| API-only (no contract/UI break) | Yes | No (smoke staging API if needed) |
| Web UI / help / legal / frontend config | Deploys with branch | **Yes** — assets are baked into the IPA |
| Capacitor / plugins / entitlements / `Info.plist` | N/A | **Yes** |
| Native `.env` / API URL / Clerk key | N/A | **Yes** (re-prepare + archive) |
| Docs, e2e, scripts, monitoring dashboard config | N/A | No |

**Gray area**

- API change that the current app UI already handles → no new IPA; smoke one device session if risky.
- API change that **breaks** the current app UI → ship matching frontend with the API; that frontend change **does** need a new IPA.
- Low-risk production website-only copy (phones lag until the next store release) is allowed; do not do this for checkout, auth, or payment UI.

## Version numbering

| Field | Where | Rule |
|---|---|---|
| Marketing version | Xcode `MARKETING_VERSION` (e.g. `1.0.1`) | Semver aligned with git tag `v1.0.1`. Bump for customer-facing App Store releases (patch for fixes, minor for features). |
| Build number | Xcode `CURRENT_PROJECT_VERSION` (integer) | Monotonic; **never reuse**. Bump on **every** App Store Connect upload (staging TestFlight and production archives both bump). |
| Git tag | `vX.Y.Z` on `main` | Same as marketing version for that production cut. |

Do not sync App Store versions from root `package.json` (`0.0.0`). Keep versioning in Xcode (via the bump scripts below).

## Staging TestFlight

From the commit you want testers to run (usually on `develop`):

```bash
pnpm release:ios:bump-build
pnpm release:ios:staging
pnpm release:ios:open
```

Then in Xcode:

1. Select a physical iPhone or “Any iOS Device (arm64)”.
2. Build Release and smoke the [device matrix](./IOS_APP.md#required-physical-device-matrix) for the changed flows.
3. **Product → Archive** → Validate → Upload to App Store Connect.
4. Distribute to Internal Testing in TestFlight.

This binary talks to the **staging** API (from `.env.native.staging`).

## App Store candidate

From the **same git SHA** as the production tag on `main`:

```bash
pnpm release:ios:set-version -- 1.0.1   # when cutting a new marketing version
pnpm release:ios:bump-build
pnpm release:ios:production
pnpm release:ios:open
```

Then Archive → Validate → Upload, and submit for App Store review. This binary talks to the **production** API (from `.env.native.production`).

Never promote a staging-targeted archive as the production App Store version.

## Script cheat sheet

| Command | What it does |
|---|---|
| `pnpm release:ios:staging` | Load `.env.native.staging`, run native env gate, `ios:sync` |
| `pnpm release:ios:production` | Load `.env.native.production`, run native env gate, `ios:sync` |
| `pnpm release:ios:bump-build` | Increment `CURRENT_PROJECT_VERSION` in the Xcode project |
| `pnpm release:ios:set-version -- 1.0.1` | Set `MARKETING_VERSION` |
| `pnpm release:ios:open` | Open `App.xcworkspace` in Xcode |
| `pnpm run release:check-env -- --environment staging --component native` | Env gate only (also run inside prepare) |

Copy env templates once:

```bash
cp .env.native.staging.example .env.native.staging
cp .env.native.production.example .env.native.production
```

Fill real values locally. Those files are gitignored.

## Schema and secrets

- Apply schema changes on staging first. Production `pnpm --filter @workspace/db run push` only with explicit authorization and a backup plan ([DATABASE_BACKUP_AND_RECOVERY.md](./DATABASE_BACKUP_AND_RECOVERY.md)).
- Web/API env changes live in Railway and Cloudflare Workers Builds dashboards; redeploy after runtime secret changes. `VITE_*` changes need a frontend rebuild (automatic on the next branch deploy).
- After editing `.env.native.*`, re-run `pnpm release:ios:staging` or `pnpm release:ios:production` before archiving.

## Post-deploy smoke

- Web/API: [PRODUCTION.md § Post-Deploy Verification](../PRODUCTION.md#9-post-deploy-verification)
- iOS: [IOS_APP.md physical-device matrix](./IOS_APP.md#required-physical-device-matrix)
- Release blockers / evidence: [RELEASE_READINESS.md](./RELEASE_READINESS.md)

## Related docs

- [ENVIRONMENTS.md](./ENVIRONMENTS.md) — staging/production isolation and branch deploy wiring
- [IOS_APP.md](./IOS_APP.md) — Capacitor, auth, TestFlight details
- [../PRODUCTION.md](../PRODUCTION.md) — deploy checklist, rollback, verification
- [RELEASE_READINESS.md](./RELEASE_READINESS.md) — current go/no-go ledger
