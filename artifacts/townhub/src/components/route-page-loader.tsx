import { Loader2 } from "lucide-react";

/** Lightweight fallback while a lazy route chunk loads. */
export function RoutePageLoader() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--site-header-height,4rem))] items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading page" />
    </div>
  );
}
