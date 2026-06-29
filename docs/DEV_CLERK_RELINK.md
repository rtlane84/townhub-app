# Dev Clerk User Relink

If you change or repair Clerk keys locally, Clerk may issue a **new user ID** for the same email. TownHub stores the Clerk user ID as `users.id` and references it from:

- `businesses.owner_id`
- `business_applications.user_id` / `reviewed_by`
- `media_assets.uploaded_by_user_id`

When IDs drift, you may see:

- Signed in, but app treats you as a new `CUSTOMER`
- `/setup` says an admin already exists
- Business dashboard says no business is linked

This repair path is **development only** (`NODE_ENV` must not be `production`).

---

## 1. Diagnose

**If you only see a `user_xxx@user.local` email**, Clerk did not attach your real email to the session. Start with **scan** (not diagnose):

```bash
pnpm --filter @workspace/api-server run relink-clerk-user -- \
  --scan \
  --clerk-user-id=user_xxxxxxxx
```

This lists local `ADMIN` / `BUSINESS_OWNER` rows and suggests the exact relink command.

### Signed-in API scan

```bash
curl http://localhost:8080/api/dev/clerk-relink/scan \
  -H "Authorization: Bearer <clerk_session_token>"
```

### Diagnose by real email

```bash
curl -X POST http://localhost:8080/api/dev/clerk-relink/diagnose \
  -H "Authorization: Bearer <clerk_session_token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

### CLI

```bash
pnpm --filter @workspace/api-server run relink-clerk-user -- \
  --email=you@example.com \
  --clerk-user-id=user_xxxxxxxx \
  --diagnose
```

Look for `Clerk ID mismatch: YES` and which businesses are tied to the **email user** vs the **current Clerk ID user**.

---

## 2. Repair (recommended)

### Option A — CLI (after --scan)

```bash
# From scan output, relink OLD admin id -> your current id
pnpm --filter @workspace/api-server run relink-clerk-user -- \
  --from-clerk-user-id=user_OLD \
  --clerk-user-id=user_NEW \
  --dry-run

pnpm --filter @workspace/api-server run relink-clerk-user -- \
  --from-clerk-user-id=user_OLD \
  --clerk-user-id=user_NEW
```

Or by **real email** (not `@user.local`):

```bash
pnpm --filter @workspace/api-server run relink-clerk-user -- \
  --email=you@example.com \
  --clerk-user-id=user_NEW \
  --dry-run
```

Get `user_xxxxxxxx` from Clerk Dashboard → Users, or from browser devtools while signed in (`/api/auth/me` returns your current `id`).

### Option B — API while signed in

Uses your **current Clerk session** as the new ID:

```bash
curl -X POST http://localhost:8080/api/dev/clerk-relink/execute \
  -H "Authorization: Bearer <clerk_session_token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

Add `"dryRun": true` to preview without writing.

---

## 3. Manual SQL (last resort)

Replace placeholders and run in a transaction against your local DB.

```sql
BEGIN;

-- 1) Point foreign keys at the new Clerk user ID
UPDATE businesses SET owner_id = 'user_NEW' WHERE owner_id = 'user_OLD';
UPDATE business_applications SET user_id = 'user_NEW' WHERE user_id = 'user_OLD';
UPDATE business_applications SET reviewed_by = 'user_NEW' WHERE reviewed_by = 'user_OLD';
UPDATE media_assets SET uploaded_by_user_id = 'user_NEW' WHERE uploaded_by_user_id = 'user_OLD';

-- 2a) If an auto-created row exists at user_NEW, merge role/email then delete user_OLD
UPDATE users
SET email = 'you@example.com', role = 'ADMIN', name = COALESCE(name, (SELECT name FROM users WHERE id = 'user_OLD'))
WHERE id = 'user_NEW';

DELETE FROM users WHERE id = 'user_OLD';

-- 2b) OR if user_NEW row does not exist yet, rename the primary key:
-- UPDATE users SET id = 'user_NEW' WHERE id = 'user_OLD';

COMMIT;
```

Use **2a** when Clerk already created a stray `CUSTOMER` row for the new ID. Use **2b** only when no row exists for `user_NEW`.

---

## What the repair does

- Finds the canonical local user by **email**
- Moves business/application/media ownership from the old Clerk ID to the new one
- Merges roles if a duplicate user row exists at the new ID (keeps `ADMIN` over `CUSTOMER`)
- Deletes the stale user row — **does not create a second admin**

Console output lists the email, old/new IDs, role, and businesses relinked.

---

Use this when you have **two separate Clerk logins** (e.g. one for platform admin, one for a business) and relink incorrectly merged them into one user.

```bash
pnpm --filter @workspace/api-server run assign-dev-clerk-accounts
pnpm --filter @workspace/api-server run assign-dev-clerk-accounts -- --dry-run
```

Default local mapping:

| Clerk user ID | Role | Business |
|---------------|------|----------|
| `user_3FanH1LUiXhYsqmzJQRtq8VikvE` | ADMIN | — |
| `user_3FZKozUJTQBgBtkCDmVKOz3wZrp` | BUSINESS_OWNER | Clay Diner (#1) |

Override with env vars: `ADMIN_CLERK_USER_ID`, `DINER_CLERK_USER_ID`.

---

## Production

`/api/dev/clerk-relink/*` returns **404** in production. The CLI exits with an error if `NODE_ENV=production`.
