/**
 * Split names like "TownHaven" / "Community TownHaven" into styled parts.
 * The `hub` property name is retained for compatibility with persisted theme fields.
 */
export type BrandParts = {
  prefix: string;
  town: string | null;
  hub: string | null;
};

export function splitPlatformBrandName(name: string): BrandParts {
  const trimmed = name.trim();
  const townHaven = trimmed.match(/^(.*?)(Town)(Haven)$/i);
  if (townHaven) {
    return {
      prefix: townHaven[1] ?? "",
      town: townHaven[2] ?? "Town",
      hub: townHaven[3] ?? "Haven",
    };
  }
  const havenOnly = trimmed.match(/^(.*)(Haven)$/i);
  if (havenOnly && havenOnly[1]?.trim()) {
    return {
      prefix: "",
      town: havenOnly[1],
      hub: havenOnly[2] ?? "Haven",
    };
  }
  return { prefix: trimmed, town: null, hub: null };
}
