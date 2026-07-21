import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchTarget = "businesses" | "events";

type HomeSearchBarProps = {
  /** Larger inline search surface used by the homepage discovery card. */
  variant?: "default" | "hero";
  className?: string;
};

export function HomeSearchBar({
  variant = "default",
  className,
}: HomeSearchBarProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<SearchTarget>("businesses");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (target === "events") {
      setLocation(
        trimmed ? `/events?q=${encodeURIComponent(trimmed)}` : "/events",
      );
      return;
    }
    setLocation(
      trimmed
        ? `/businesses?search=${encodeURIComponent(trimmed)}`
        : "/businesses",
    );
  }

  if (variant === "hero") {
    return (
      <form
        onSubmit={handleSubmit}
        className={cn(
          "pointer-events-auto w-full rounded-2xl border border-black/[0.08] bg-background/95 p-1.5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.18)] backdrop-blur-sm",
          className,
        )}
        role="search"
        aria-label="Search events and businesses"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="flex shrink-0 rounded-xl bg-muted/70 p-0.5"
            role="group"
            aria-label="Search in"
          >
            {(
              [
                { id: "businesses", label: "Shops" },
                { id: "events", label: "Events" },
              ] as const
            ).map((option) => {
              const active = target === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTarget(option.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-black text-white"
                      : "text-muted-foreground",
                  )}
                  aria-pressed={active}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                target === "events"
                  ? "Search events"
                  : "Search shops, food, services, and events"
              }
              className="h-10 w-full rounded-xl bg-transparent pl-8 pr-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
              aria-label={
                target === "events" ? "Search events" : "Search businesses"
              }
            />
          </div>

          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.97]"
            aria-label="Search"
          >
            <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-[1.35rem] border border-black/[0.04] bg-card p-2.5 shadow-[0_2px_16px_-8px_rgba(15,23,42,0.1)] sm:p-3",
        className,
      )}
      role="search"
      aria-label="Search events and businesses"
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            target === "events" ? "Search events..." : "Search businesses..."
          }
          className="h-12 w-full rounded-full border border-black/[0.06] bg-muted/40 pl-11 pr-24 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-black/15 focus:bg-background"
          aria-label={
            target === "events" ? "Search events" : "Search businesses"
          }
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Search
        </button>
      </div>

      <div
        className="mt-2.5 flex gap-1.5"
        role="group"
        aria-label="Search in"
      >
        {(
          [
            { id: "businesses", label: "Businesses" },
            { id: "events", label: "Events" },
          ] as const
        ).map((option) => {
          const active = target === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTarget(option.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                active
                  ? "bg-black text-white"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={active}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}
