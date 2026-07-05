import fs from "node:fs";
import path from "node:path";

const AUTH_DIR = path.join(process.cwd(), "tests/e2e/fixtures/.auth");

export function ownerAuthStatePath(): string {
  return path.join(AUTH_DIR, "owner.json");
}

export function adminAuthStatePath(): string {
  return path.join(AUTH_DIR, "admin.json");
}

export function hasOwnerAuthState(): boolean {
  return fs.existsSync(ownerAuthStatePath());
}

export function hasAdminAuthState(): boolean {
  return fs.existsSync(adminAuthStatePath());
}

export const OWNER_AUTH_SKIP_REASON =
  "Owner auth storage state missing. See docs/PLAYWRIGHT_E2E.md to generate tests/e2e/fixtures/.auth/owner.json.";

export const ADMIN_AUTH_SKIP_REASON =
  "Admin auth storage state missing. See docs/PLAYWRIGHT_E2E.md to generate tests/e2e/fixtures/.auth/admin.json.";
