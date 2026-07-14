import { isUsStateAbbreviation, normalizeUsStateAbbreviation } from "./us-states";

/** 5-digit ZIP, optional +4 extension. */
export const US_ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;

export type StreetAddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export function isValidUsZip(zip: string): boolean {
  return US_ZIP_PATTERN.test(zip.trim());
}

/** Digits used for Zippopotam lookups (first 5). */
export function normalizeUsZipForLookup(zip: string): string | null {
  const digits = zip.replace(/\D/g, "");
  if (digits.length < 5) return null;
  return digits.slice(0, 5);
}

export function composeStreetAddress(parts: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const street = parts.street.trim();
  const city = parts.city.trim();
  const state = parts.state.trim().toUpperCase();
  const zip = parts.zip.trim();
  const zip5 = normalizeUsZipForLookup(zip) ?? zip;

  if (!street && !city && !state && !zip5) return "";
  if (street && city && state && zip5) {
    return `${street}, ${city}, ${state} ${zip5}`;
  }
  // Partial compose while the user is still typing / looking up ZIP.
  const locality = [city, [state, zip5].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [street, locality].filter(Boolean).join(", ");
}

/**
 * Best-effort parse of a legacy free-text address into street / city / state / ZIP.
 * On failure, puts the whole string in `street` and leaves the rest blank.
 */
export function parseStreetAddress(raw: unknown): StreetAddressParts {
  const empty: StreetAddressParts = { street: "", city: "", state: "", zip: "" };
  if (typeof raw !== "string") return empty;
  const trimmed = raw.trim();
  if (!trimmed) return empty;

  // "123 Main St, Clay, WV 25043" or "..., WV 25043-1234"
  const withZip = trimmed.match(
    /^(.*?),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/,
  );
  if (withZip) {
    const state = normalizeUsStateAbbreviation(withZip[3]);
    if (state) {
      return {
        street: withZip[1].trim(),
        city: withZip[2].trim(),
        state,
        zip: withZip[4],
      };
    }
  }

  // "123 Main St, Clay WV 25043" (city/state not comma-separated)
  const inlineState = trimmed.match(
    /^(.*?),\s*(.+?)\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/,
  );
  if (inlineState) {
    const state = normalizeUsStateAbbreviation(inlineState[3]);
    if (state) {
      return {
        street: inlineState[1].trim(),
        city: inlineState[2].trim(),
        state,
        zip: inlineState[4],
      };
    }
  }

  // Trailing ZIP only — keep remainder as street
  const trailingZip = trimmed.match(/^(.*?)\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (trailingZip && isValidUsZip(trailingZip[2])) {
    const before = trailingZip[1].trim().replace(/,\s*$/, "");
    const stateMatch = before.match(/^(.*?),\s*([A-Za-z]{2})$/);
    if (stateMatch && isUsStateAbbreviation(stateMatch[2])) {
      return {
        street: stateMatch[1].trim(),
        city: "",
        state: stateMatch[2].toUpperCase(),
        zip: trailingZip[2],
      };
    }
    return {
      street: before,
      city: "",
      state: "",
      zip: trailingZip[2],
    };
  }

  return { street: trimmed, city: "", state: "", zip: "" };
}

/** True when street + ZIP + resolved city/state are present for a required address. */
export function isCompleteStreetAddress(parts: StreetAddressParts): boolean {
  return Boolean(
    parts.street.trim() &&
      parts.city.trim() &&
      isUsStateAbbreviation(parts.state) &&
      isValidUsZip(parts.zip),
  );
}
