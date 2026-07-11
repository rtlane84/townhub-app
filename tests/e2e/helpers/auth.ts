import fs from "node:fs";
import path from "node:path";

const AUTH_DIR = path.join(process.cwd(), "tests/e2e/fixtures/.auth");

export function applicantAuthStatePath(): string {
  return path.join(AUTH_DIR, "applicant.json");
}

export function hasApplicantAuthState(): boolean {
  return fs.existsSync(applicantAuthStatePath());
}

export const APPLICANT_AUTH_SKIP_REASON =
  "Applicant auth storage state missing. Generate tests/e2e/fixtures/.auth/applicant.json (Clerk user with no approved business).";

export const APPLICANT_PENDING_SKIP_REASON =
  "Applicant already has a pending application. Approve or reject it in admin, or use a fresh applicant account.";

export class ApplicantPendingApplicationError extends Error {
  constructor() {
    super(APPLICANT_PENDING_SKIP_REASON);
    this.name = "ApplicantPendingApplicationError";
  }
}

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
