/**
 * Split names like "Clay TownHub" / "TownHub" into styled parts.
 * Falls back to a single string when "Hub" isn't present.
 */
export type BrandParts = {
  prefix: string;
  town: string | null;
  hub: string | null;
};

export function splitPlatformBrandName(name: string): BrandParts {
  const trimmed = name.trim();
  const townHub = trimmed.match(/^(.*?)(Town)(Hub)$/i);
  if (townHub) {
    return {
      prefix: townHub[1] ?? "",
      town: townHub[2] ?? "Town",
      hub: townHub[3] ?? "Hub",
    };
  }
  const hubOnly = trimmed.match(/^(.*)(Hub)$/i);
  if (hubOnly && hubOnly[1]?.trim()) {
    return {
      prefix: "",
      town: hubOnly[1],
      hub: hubOnly[2] ?? "Hub",
    };
  }
  return { prefix: trimmed, town: null, hub: null };
}
