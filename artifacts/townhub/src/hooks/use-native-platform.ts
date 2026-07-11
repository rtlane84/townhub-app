import {
  isAndroid,
  isIOS,
  isNativeApp,
  isWeb,
  shouldEnableNativePullToRefresh,
  shouldShowNativeBottomTabs,
} from "@/lib/native-platform";
import { useLocation } from "wouter";

/**
 * Platform flags are fixed for the page lifetime.
 * Cached so callers always get a stable object reference.
 *
 * Important: do not use useSyncExternalStore with a getSnapshot that
 * allocates a new object each call — that causes an infinite re-render
 * loop (React minified error #185 / "Maximum update depth exceeded").
 */
const NATIVE_PLATFORM = {
  isNative: isNativeApp(),
  isIOS: isIOS(),
  isAndroid: isAndroid(),
  isWeb: isWeb(),
} as const;

export function useNativePlatform() {
  return NATIVE_PLATFORM;
}

export function useNativeBottomTabs() {
  const { isNative } = useNativePlatform();
  const [location] = useLocation();
  return isNative && shouldShowNativeBottomTabs(location);
}

export function useNativePullToRefresh() {
  const { isNative } = useNativePlatform();
  const [location] = useLocation();
  return isNative && shouldEnableNativePullToRefresh(location);
}
