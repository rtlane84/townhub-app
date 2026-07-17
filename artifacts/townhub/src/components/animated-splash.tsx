import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native-platform";
import { hideNativeSplashScreen } from "@/lib/capacitor-shell";
import {
  hasNativeSplashShownThisSession,
  markNativeSplashShownThisSession,
} from "@/lib/native-splash-session";
import { usePlatformBranding } from "@/components/theme-provider";

/** Minimum time the native static launch artwork stays visible. */
const SPLASH_HOLD_MS = 1200;
/** Never pin splash longer than this waiting for theme (failed/slow network). */
const SPLASH_THEME_SAFETY_MS = 2500;
/**
 * Holds the native static LaunchScreen artwork, then dismisses it directly into
 * the main app shell. This component renders no visual overlay of its own.
 * Skipped on in-session remounts (e.g. Google OAuth return via location.assign).
 *
 * Hold ends after the minimum branding hold once theme is ready (or cached),
 * with a hard safety cap so a stuck theme fetch cannot pin the overlay.
 */
export function AnimatedSplash() {
  const native = isNativeApp();
  const { themeLoading } = usePlatformBranding();
  const [visible, setVisible] = useState(() => {
    if (!native) return false;
    // OAuth / deep-link remounts share this WebView session — don't replay splash.
    return !hasNativeSplashShownThisSession();
  });
  const [minHoldElapsed, setMinHoldElapsed] = useState(false);
  const [safetyElapsed, setSafetyElapsed] = useState(false);

  // Hand off from the native LaunchScreen once its hold is complete.
  useEffect(() => {
    if (!native || visible) return;
    let cancelled = false;
    const handoff = () => {
      if (cancelled) return;
      void hideNativeSplashScreen();
    };
    // Let the app shell paint before removing the native layer.
    requestAnimationFrame(() => {
      requestAnimationFrame(handoff);
    });
    return () => {
      cancelled = true;
    };
  }, [native, visible]);

  // Remember that splash ran so OAuth remounts skip it.
  useEffect(() => {
    if (!native || !visible) return;
    markNativeSplashShownThisSession();
  }, [native, visible]);

  useEffect(() => {
    if (!native || !visible) return;
    const minTimer = window.setTimeout(() => setMinHoldElapsed(true), SPLASH_HOLD_MS);
    const safetyTimer = window.setTimeout(
      () => setSafetyElapsed(true),
      SPLASH_THEME_SAFETY_MS,
    );
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(safetyTimer);
    };
  }, [native, visible]);

  // Dismiss once the min hold elapsed and theme is ready, or when safety fires.
  useEffect(() => {
    if (!native || !visible) return;
    if (safetyElapsed || (minHoldElapsed && !themeLoading)) {
      setVisible(false);
    }
  }, [native, visible, minHoldElapsed, themeLoading, safetyElapsed]);

  return null;
}
