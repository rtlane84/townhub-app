import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerPullToRefreshHaptic } from "@/lib/native-haptics";

const PULL_THRESHOLD_PX = 72;
const MAX_PULL_PX = 120;

type NativePullToRefreshProps = {
  enabled: boolean;
  children: ReactNode;
};

export function NativePullToRefresh({ enabled, children }: NativePullToRefreshProps) {
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resetPull = useCallback(() => {
    pulling.current = false;
    startY.current = 0;
    setPullDistance(0);
  }, []);

  const runRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    triggerPullToRefreshHaptic();
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
      resetPull();
    }
  }, [queryClient, refreshing, resetPull]);

  useEffect(() => {
    if (!enabled) {
      resetPull();
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const getScrollTop = () => {
      const scrollingElement = document.scrollingElement ?? document.documentElement;
      return scrollingElement.scrollTop;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing || getScrollTop() > 0) return;
      pulling.current = true;
      startY.current = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      if (getScrollTop() > 0) {
        resetPull();
        return;
      }
      event.preventDefault();
      setPullDistance(Math.min(delta * 0.5, MAX_PULL_PX));
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      if (pullDistance >= PULL_THRESHOLD_PX) {
        void runRefresh();
        return;
      }
      resetPull();
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, pullDistance, refreshing, resetPull, runRefresh]);

  if (!enabled) {
    return <>{children}</>;
  }

  const progress = Math.min(pullDistance / PULL_THRESHOLD_PX, 1);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 flex flex-col">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-30 flex items-end justify-center transition-[height,opacity] duration-150",
          pullDistance > 0 || refreshing ? "opacity-100" : "opacity-0",
        )}
        style={{ height: refreshing ? 48 : pullDistance }}
      >
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/95 shadow-sm border border-border/60">
          <Loader2
            className={cn(
              "h-4 w-4 text-primary",
              refreshing ? "animate-spin" : "",
            )}
            style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
