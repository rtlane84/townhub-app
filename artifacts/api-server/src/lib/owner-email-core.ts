import { isSyntheticClerkEmail } from "./relink-clerk-user-shared";

export function isDeliverableEmail(email: string | null | undefined): email is string {
  if (!email?.trim()) return false;
  return !isSyntheticClerkEmail(email);
}

export function emailFromSessionClaims(
  claims: Record<string, unknown> | undefined,
): string | null {
  if (!claims) return null;

  const directCandidates = [
    claims.email,
    claims.primaryEmailAddress,
    claims.primary_email_address,
    claims.email_address,
  ];

  for (const raw of directCandidates) {
    if (typeof raw === "string" && isDeliverableEmail(raw)) {
      return raw.trim();
    }
  }

  const emails = claims.emails;
  if (Array.isArray(emails)) {
    for (const entry of emails) {
      if (typeof entry === "string" && isDeliverableEmail(entry)) return entry.trim();
      if (entry && typeof entry === "object") {
        const addr = (entry as { email_address?: string }).email_address;
        if (typeof addr === "string" && isDeliverableEmail(addr)) return addr.trim();
      }
    }
  }

  return null;
}
