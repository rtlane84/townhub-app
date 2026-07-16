import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { isNativeApp } from "@/lib/native-platform";
import { hideNativeSplashScreen } from "@/lib/capacitor-shell";
import {
  hasNativeSplashShownThisSession,
  markNativeSplashShownThisSession,
} from "@/lib/native-splash-session";
import { usePlatformBranding } from "@/components/theme-provider";
import { PlatformBrandMark } from "@/components/platform-brand-mark";

/** Static launch logo — matches iOS LaunchScreen / Splash.imageset mark. */
const SPLASH_LOGO_SRC = "/splash-logo.png";

/** Minimum time the branded splash stays up before cross-fading to the app. */
const SPLASH_HOLD_MS = 1200;
/** Never pin splash longer than this waiting for theme (failed/slow network). */
const SPLASH_THEME_SAFETY_MS = 2500;
const CROSS_FADE_MS = 280;
/** Keep the mark compact so the cold-start frame matches LaunchScreen (160pt). */
const SPLASH_LOGO_SIZE_PX = 160;

/**
 * Always light — matches Capacitor SplashScreen / LaunchScreen `#F4F5F8`.
 * Dark-mode canvas made the transparent logo corners read as a black screen.
 */
const SPLASH_CANVAS = "#F4F5F8";

/**
 * Native cold-start splash: solid light canvas, a subtle logo fade/scale,
 * fade-in wordmark, then a quick cross-fade into the main app shell.
 * Skipped on in-session remounts (e.g. Google OAuth return via location.assign).
 *
 * Hold ends after the minimum branding hold once theme is ready (or cached),
 * with a hard safety cap so a stuck theme fetch cannot pin the overlay.
 */
export function AnimatedSplash() {
  const native = isNativeApp();
  const reduceMotion = useReducedMotion();
  const { platformName, themeLoading } = usePlatformBranding();
  const [visible, setVisible] = useState(() => {
    if (!native) return false;
    // OAuth / deep-link remounts share this WebView session — don't replay splash.
    return !hasNativeSplashShownThisSession();
  });
  const [logoReady, setLogoReady] = useState(false);
  const [minHoldElapsed, setMinHoldElapsed] = useState(false);
  const [safetyElapsed, setSafetyElapsed] = useState(false);

  // Start the logo animation once the asset is decodable (including cache hits).
  useEffect(() => {
    if (!native || !visible) return;
    let cancelled = false;
    const img = new Image();
    img.src = SPLASH_LOGO_SRC;
    const markReady = () => {
      if (!cancelled) setLogoReady(true);
    };
    if (img.complete) {
      markReady();
    } else {
      img.addEventListener("load", markReady, { once: true });
      img.addEventListener("error", markReady, { once: true });
    }
    return () => {
      cancelled = true;
    };
  }, [native, visible]);

  // Hand off from the native LaunchScreen / Capacitor splash as soon as we paint.
  useEffect(() => {
    if (!native) return;
    let cancelled = false;
    const handoff = () => {
      if (cancelled) return;
      void hideNativeSplashScreen();
    };
    // Two frames so the React overlay is on screen before the native layer fades
    // (or immediately if we skipped the branded splash).
    requestAnimationFrame(() => {
      requestAnimationFrame(handoff);
    });
    return () => {
      cancelled = true;
    };
  }, [native]);

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

  if (!native) return null;

  const subBrand = "ONE COMMUNITY.";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="townhub-animated-splash"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-8"
          style={{ backgroundColor: SPLASH_CANVAS }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: CROSS_FADE_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          <div className="flex flex-col items-center gap-5">
            <motion.img
              src={SPLASH_LOGO_SRC}
              alt=""
              width={SPLASH_LOGO_SIZE_PX}
              height={SPLASH_LOGO_SIZE_PX}
              draggable={false}
              className="select-none object-contain"
              style={{ width: SPLASH_LOGO_SIZE_PX, height: SPLASH_LOGO_SIZE_PX }}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={
                reduceMotion
                  ? { opacity: 1, scale: 1 }
                  : logoReady
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.94 }
              }
              transition={
                reduceMotion || !logoReady
                  ? { duration: reduceMotion ? 0 : 0.3 }
                  : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
              }
            />

            <motion.div
              className="flex flex-col items-center gap-1.5 text-center"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { delay: 0.18, duration: 0.38, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <PlatformBrandMark
                name={platformName}
                className="text-xl tracking-tight sm:text-2xl"
              />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "rgba(30,58,95,0.55)" }}
              >
                LOCAL INFO. LOCAL BUSINESSES.
              </p>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "#b8894a" }}
              >
                {subBrand}
              </p>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
