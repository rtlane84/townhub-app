export function e2eBaseUrl(): string {
  return process.env.E2E_BASE_URL ?? "http://localhost:23032";
}

export function e2eApiUrl(): string {
  return process.env.E2E_API_URL ?? "http://localhost:8080";
}

export function e2eBusinessSlugOverride(): string | undefined {
  const slug = process.env.E2E_BUSINESS_SLUG?.trim();
  return slug || undefined;
}

export function uniqueE2EEmail(prefix = "e2e-guest"): string {
  const stamp = Date.now();
  return `${prefix}+${stamp}@example.com`;
}
