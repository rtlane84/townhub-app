import type { Business } from "@workspace/api-client-react";
import { directionsUrl, type DirectionsPlatform } from "./directions.ts";
import { isNativeApp } from "./native-platform.ts";

export type StorefrontPresence =
  | "mobile"
  | "physical"
  | "online"
  | "unknown";

/** Classify how a business presents location — never invents coordinates. */
export function resolveStorefrontPresence(
  business: Pick<Business, "address"> & {
    isMobileBusiness?: boolean | null;
    eventLocationEnabled?: boolean | null;
  },
): StorefrontPresence {
  const isMobile =
    business.isMobileBusiness === true || business.eventLocationEnabled === true;
  if (isMobile) return "mobile";

  const address = business.address?.trim();
  if (address) return "physical";

  // No address and not mobile → treat as online / no public storefront location
  return "online";
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Directions URL for a stop — prefers coordinates, then address, then name. */
export function locationDirectionsUrl(loc: {
  address?: string | null;
  locationName?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}, platform?: DirectionsPlatform): string | null {
  const lat = loc.latitude?.trim();
  const lng = loc.longitude?.trim();
  if (lat && lng) {
    return directionsUrl(`${lat},${lng}`, platform);
  }
  const query = loc.address?.trim() || loc.locationName?.trim();
  return query ? directionsUrl(query, platform) : null;
}

const FAVORITES_KEY = "townhub:favorite-business-ids";

export function readFavoriteBusinessIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === "number");
  } catch {
    return [];
  }
}

export function isBusinessFavorited(businessId: number): boolean {
  return readFavoriteBusinessIds().includes(businessId);
}

export function toggleFavoriteBusiness(businessId: number): boolean {
  const current = readFavoriteBusinessIds();
  const next = current.includes(businessId)
    ? current.filter((id) => id !== businessId)
    : [...current, businessId];
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private mode failures
  }
  return next.includes(businessId);
}

function isShareCanceled(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message?: unknown }).message ?? "").toLowerCase();
    if (message.includes("share canceled") || message.includes("share cancelled")) {
      return true;
    }
  }
  return false;
}

export async function shareStorefrontPage(input: {
  title: string;
  text?: string;
  url: string;
}): Promise<"shared" | "copied" | "failed"> {
  try {
    if (isNativeApp()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: input.title,
        text: input.text,
        url: input.url,
        dialogTitle: input.title,
      });
      return "shared";
    }

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({
        title: input.title,
        text: input.text,
        url: input.url,
      });
      return "shared";
    }
  } catch (err) {
    // User cancel should not fall through to clipboard as an error toast
    if (isShareCanceled(err)) {
      return "failed";
    }
  }

  try {
    await navigator.clipboard.writeText(input.url);
    return "copied";
  } catch {
    return "failed";
  }
}
