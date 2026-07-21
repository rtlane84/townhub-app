import { isIOS, isNativeApp } from "./native-platform.ts";

export type DirectionsPlatform = "ios" | "other";

function currentDirectionsPlatform(): DirectionsPlatform {
  return isNativeApp() && isIOS() ? "ios" : "other";
}

/** Build a directions handoff for the current platform. */
export function directionsUrl(
  destination: string,
  platform: DirectionsPlatform = currentDirectionsPlatform(),
): string {
  const encodedDestination = encodeURIComponent(destination);
  // The iOS shell opens maps: directly, launching Apple Maps instead of
  // relying on the Google Maps browser handoff.
  if (platform === "ios") {
    return `maps://?daddr=${encodedDestination}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
}
