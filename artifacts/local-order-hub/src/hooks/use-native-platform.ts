import { useSyncExternalStore } from "react";
import {
  isAndroid,
  isIOS,
  isNativeApp,
  isWeb,
  shouldEnableNativePullToRefresh,
  shouldShowNativeBottomTabs,
} from "@/lib/native-platform";
import { useLocation } from "wouter";

function subscribeNativePlatform(onStoreChange: () => void) {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function getNativePlatformSnapshot() {
  return {
    isNative: isNativeApp(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isWeb: isWeb(),
  };
}

/** Reactive native platform detection for Capacitor shells. */
export function useNativePlatform() {
  return useSyncExternalStore(subscribeNativePlatform, getNativePlatformSnapshot, () => ({
    isNative: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
  }));
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
