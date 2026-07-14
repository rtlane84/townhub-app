import { isNativeApp } from "./native-platform.ts";

export type DistributionChannel = "web" | "app-store" | "play-store";

export function resolveDistributionChannel(
  configured?: string,
  nativePlatform = false,
): DistributionChannel {
  if (configured === "app-store" || configured === "play-store") return configured;
  if (nativePlatform) return "app-store";
  return "web";
}

/** Store builds may show plan status but must not initiate or manage owner SaaS billing. */
export function isStoreDistribution(): boolean {
  return resolveDistributionChannel(
    import.meta.env.VITE_DISTRIBUTION_CHANNEL,
    isNativeApp(),
  ) !== "web";
}
