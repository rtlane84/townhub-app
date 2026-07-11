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

/** Total time the branded splash stays up before cross-fading to the app. */
const SPLASH_HOLD_MS = 3000;
const CROSS_FADE_MS = 420;
/** Keep the mark compact so the cold-start frame matches LaunchScreen (160pt). */
const SPLASH_LOGO_SIZE_PX = 160;

/**
 * Always light — matches Capacitor SplashScreen / LaunchScreen `#F4F5F8`.
 * Dark-mode canvas made the transparent logo corners read as a black screen.
 */
const SPLASH_CANVAS = "#F4F5F8";

/**
 * Native cold-start splash: solid light canvas, launch logo with spring spin,
 * fade-in wordmark, then cross-fade into the main app shell.
 * Skipped on in-session remounts (e.g. Google OAuth return via location.assign).
 */
export function AnimatedSplash() {
  const native = isNativeApp();
  const reduceMotion = useReducedMotion();
  const { platformName } = usePlatformBranding();
  const [visible, setVisible] = useState(() => {
    if (!native) return false;
    // OAuth / deep-link remounts share this WebView session — don't replay splash.
    return !hasNativeSplashShownThisSession();
  });
  const [logoReady, setLogoReady] = useState(false);

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

  // Phase 3 — leave after the hold, regardless of theme fetch.
  useEffect(() => {
    if (!native || !visible) return;
    const timer = window.setTimeout(() => setVisible(false), SPLASH_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [native, visible]);

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
              initial={reduceMotion ? false : { opacity: 0, rotate: 0 }}
              animate={
                reduceMotion
                  ? { opacity: 1, rotate: 0 }
                  : logoReady
                    ? { opacity: 1, rotate: 360 }
                    : { opacity: 0, rotate: 0 }
              }
              transition={
                reduceMotion || !logoReady
                  ? { duration: reduceMotion ? 0 : 0.35 }
                  : {
                      opacity: { duration: 0.35, ease: "easeOut" },
                      rotate: {
                        type: "spring",
                        stiffness: 70,
                        damping: 14,
                        mass: 0.9,
                      },
                    }
              }
            />

            <motion.div
              className="flex flex-col items-center gap-1.5 text-center"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
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
