import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { isNativeApp } from "@/lib/native-platform";
import { hideNativeSplashScreen } from "@/lib/capacitor-shell";
import { usePlatformBranding } from "@/components/theme-provider";
import { PlatformBrandMark } from "@/components/platform-brand-mark";

/** Static launch logo — matches iOS LaunchScreen / Splash.imageset mark. */
const SPLASH_LOGO_SRC = "/splash-logo.png";

/** Total time the branded splash stays up before cross-fading to the app. */
const SPLASH_HOLD_MS = 2500;
const CROSS_FADE_MS = 420;

function useSplashCanvasIsDark(): boolean {
  const [dark, setDark] = useState(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
      return true;
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      setDark(document.documentElement.classList.contains("dark") || mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mq.removeEventListener("change", sync);
      observer.disconnect();
    };
  }, []);

  return dark;
}

/**
 * Native cold-start splash: solid canvas (light/dark), launch logo with spring
 * spin, fade-in wordmark, then cross-fade into the main app shell.
 */
export function AnimatedSplash() {
  const native = isNativeApp();
  const reduceMotion = useReducedMotion();
  const isDark = useSplashCanvasIsDark();
  const { platformName } = usePlatformBranding();
  const [visible, setVisible] = useState(native);
  const [logoReady, setLogoReady] = useState(false);

  // Start the logo animation once the asset is decodable (including cache hits).
  useEffect(() => {
    if (!native) return;
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
  }, [native]);

  // Hand off from the native LaunchScreen / Capacitor splash as soon as we paint.
  useEffect(() => {
    if (!native) return;
    let cancelled = false;
    const handoff = () => {
      if (cancelled) return;
      void hideNativeSplashScreen();
    };
    // Two frames so the React overlay is on screen before the native layer fades.
    requestAnimationFrame(() => {
      requestAnimationFrame(handoff);
    });
    return () => {
      cancelled = true;
    };
  }, [native]);

  // Phase 3 — leave after the hold, regardless of theme fetch.
  useEffect(() => {
    if (!native || !visible) return;
    const timer = window.setTimeout(() => setVisible(false), SPLASH_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [native, visible]);

  if (!native) return null;

  const canvas = isDark ? "#1a1614" : "#F4F5F8";
  const subBrand = "ONE COMMUNITY.";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="townhub-animated-splash"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-8"
          style={{ backgroundColor: canvas }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: CROSS_FADE_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          <div className="flex flex-col items-center gap-5">
            <motion.img
              src={SPLASH_LOGO_SRC}
              alt=""
              width={196}
              height={196}
              draggable={false}
              className="h-[min(42vw,196px)] w-[min(42vw,196px)] select-none object-contain"
              initial={reduceMotion ? false : { rotate: 0 }}
              animate={
                reduceMotion
                  ? { rotate: 0 }
                  : logoReady
                    ? { rotate: 360 }
                    : { rotate: 0 }
              }
              transition={
                reduceMotion || !logoReady
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 70,
                      damping: 14,
                      mass: 0.9,
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
                style={{ color: isDark ? "rgba(255,255,255,0.72)" : "rgba(30,58,95,0.55)" }}
              >
                LOCAL INFO. LOCAL BUSINESSES.
              </p>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: isDark ? "#d4a574" : "#b8894a" }}
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
