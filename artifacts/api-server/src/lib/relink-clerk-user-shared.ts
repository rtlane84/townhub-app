import type { User } from "@workspace/db";

export type UserRole = User["role"];

export type ClerkUserSummary = {
  id: string;
  email: string;
  role: UserRole;
};

export type BusinessSummary = {
  id: number;
  name: string;
  slug: string;
};

export type ClerkRelinkScan = {
  devRepairAllowed: boolean;
  currentClerkUserId: string | null;
  currentSessionUser: ClerkUserSummary | null;
  privilegedUsers: Array<ClerkUserSummary & { businesses: BusinessSummary[] }>;
  orphanedBusinesses: Array<BusinessSummary & { ownerId: string | null }>;
  likelyCanonicalUser: (ClerkUserSummary & { businesses: BusinessSummary[] }) | null;
  recommendation: string;
};

export type ClerkRelinkDiagnosis = {
  devRepairAllowed: boolean;
  email: string;
  emailLooksSynthetic: boolean;
  currentClerkUserId: string | null;
  userMatchedByClerkId: ClerkUserSummary | null;
  userMatchedByEmail: ClerkUserSummary | null;
  clerkIdMismatch: boolean;
  businessesForClerkUser: BusinessSummary[];
  businessesForEmailUser: BusinessSummary[];
  recommendation: string;
};

export type ClerkRelinkResult = {
  dryRun: boolean;
  email: string;
  previousClerkUserId: string;
  newClerkUserId: string;
  mergedOrphanUser: boolean;
  role: UserRole;
  businessesRelinked: BusinessSummary[];
  applicationsRelinked: number;
  mediaAssetsRelinked: number;
  applicationsReviewedByRelinked: number;
  message: string;
};

const ROLE_RANK: Record<UserRole, number> = {
  CUSTOMER: 0,
  BUSINESS_OWNER: 1,
  ADMIN: 2,
};

export function isDevClerkRelinkAllowed(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv !== "production";
}

export function assertDevClerkRelinkAllowed(): void {
  if (!isDevClerkRelinkAllowed()) {
    throw new Error("Clerk user relink is disabled in production.");
  }
}

export function pickHigherRole(a: UserRole, b: UserRole): UserRole {
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
}

export function summarizeUser(user: Pick<User, "id" | "email" | "role">): ClerkUserSummary {
  return { id: user.id, email: user.email, role: user.role };
}

export function isSyntheticClerkEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith("@user.local") || /^user_[^@]+@user\.local$/.test(normalized);
}

export function isMalformedClerkUserId(userId: string): boolean {
  return userId.includes("@");
}

export function formatRelinkScan(scan: ClerkRelinkScan): string {
  const lines = [
    "=== Clerk relink scan ===",
    `Dev repair allowed: ${scan.devRepairAllowed ? "yes" : "no"}`,
    `Current Clerk user ID: ${scan.currentClerkUserId ?? "(not provided)"}`,
  ];

  if (scan.currentSessionUser) {
    lines.push(
      `Current session DB user: ${scan.currentSessionUser.id} (${scan.currentSessionUser.role}) <${scan.currentSessionUser.email}>`,
    );
  } else {
    lines.push("Current session DB user: (not found)");
  }

  lines.push("", "Privileged local users (ADMIN / BUSINESS_OWNER):");
  if (scan.privilegedUsers.length === 0) {
    lines.push("  (none)");
  } else {
    for (const user of scan.privilegedUsers) {
      const malformed = isMalformedClerkUserId(user.id) ? " [MALFORMED ID — use as --from-clerk-user-id]" : "";
      const biz =
        user.businesses.length > 0
          ? user.businesses.map((b) => `${b.name} (#${b.id})`).join(", ")
          : "(no businesses)";
      lines.push(`  - ${user.id} (${user.role}) <${user.email}> businesses: ${biz}${malformed}`);
    }
  }

  if (scan.orphanedBusinesses.length > 0) {
    lines.push("", "Businesses whose owner_id does not match a local user:");
    for (const business of scan.orphanedBusinesses) {
      lines.push(`  - ${business.name} (#${business.id}) owner_id=${business.ownerId ?? "null"}`);
    }
  }

  if (scan.likelyCanonicalUser) {
    lines.push(
      "",
      `Likely account to relink FROM: ${scan.likelyCanonicalUser.id} (${scan.likelyCanonicalUser.role}) <${scan.likelyCanonicalUser.email}>`,
    );
  }

  lines.push("", `Recommendation: ${scan.recommendation}`);
  return lines.join("\n");
}

export function formatRelinkDiagnosis(diagnosis: ClerkRelinkDiagnosis): string {
  const lines = [
    "=== Clerk relink diagnosis ===",
    `Dev repair allowed: ${diagnosis.devRepairAllowed ? "yes" : "no"}`,
    `Email: ${diagnosis.email}`,
    `Email looks synthetic (@user.local): ${diagnosis.emailLooksSynthetic ? "YES — use your real email or --scan" : "no"}`,
    `Current Clerk user ID: ${diagnosis.currentClerkUserId ?? "(not provided)"}`,
  ];

  if (diagnosis.userMatchedByEmail) {
    lines.push(
      `DB user by email: ${diagnosis.userMatchedByEmail.id} (${diagnosis.userMatchedByEmail.role})`,
    );
  } else {
    lines.push("DB user by email: (not found)");
  }

  if (diagnosis.userMatchedByClerkId) {
    lines.push(
      `DB user by Clerk ID: ${diagnosis.userMatchedByClerkId.id} (${diagnosis.userMatchedByClerkId.role})`,
    );
  } else {
    lines.push("DB user by Clerk ID: (not found)");
  }

  lines.push(`Clerk ID mismatch: ${diagnosis.clerkIdMismatch ? "YES" : "no"}`);

  if (diagnosis.businessesForEmailUser.length > 0) {
    lines.push(
      `Businesses for email user: ${diagnosis.businessesForEmailUser
        .map((b) => `${b.name} (#${b.id})`)
        .join(", ")}`,
    );
  }

  if (diagnosis.businessesForClerkUser.length > 0) {
    lines.push(
      `Businesses for Clerk ID user: ${diagnosis.businessesForClerkUser
        .map((b) => `${b.name} (#${b.id})`)
        .join(", ")}`,
    );
  }

  lines.push(`Recommendation: ${diagnosis.recommendation}`);
  return lines.join("\n");
}

export function formatRelinkResult(result: ClerkRelinkResult): string {
  const lines = [
    result.dryRun ? "=== Clerk relink dry run ===" : "=== Clerk relink complete ===",
    `Email: ${result.email}`,
    `Previous Clerk user ID: ${result.previousClerkUserId}`,
    `New Clerk user ID: ${result.newClerkUserId}`,
    `Role: ${result.role}`,
    `Merged orphan Clerk user row: ${result.mergedOrphanUser ? "yes" : "no"}`,
    `Businesses relinked: ${
      result.businessesRelinked.length > 0
        ? result.businessesRelinked.map((b) => `${b.name} (#${b.id})`).join(", ")
        : "(none)"
    }`,
    `Applications relinked: ${result.applicationsRelinked}`,
    `Application reviews relinked: ${result.applicationsReviewedByRelinked}`,
    `Media assets relinked: ${result.mediaAssetsRelinked}`,
    result.message,
  ];
  return lines.join("\n");
}
