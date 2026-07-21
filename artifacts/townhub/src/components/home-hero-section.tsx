import { CalendarDays, Store, Utensils, Wrench } from "lucide-react";
import { Link } from "wouter";
import { HomeSearchBar } from "@/components/home-search-bar";
import { ResponsiveHeroImage } from "@/components/responsive-hero-image";
import { usePlatformBranding } from "@/components/theme-provider";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { heroImageObjectClasses } from "@/lib/platform-branding";
import { resolveTownPhotoSlides } from "@/lib/town-photos";
import { cn } from "@/lib/utils";

const QUICK_ROUTES = [
  { label: "Shops", href: "/businesses", icon: Store },
  { label: "Food", href: "/businesses?type=FOOD_VENDOR", icon: Utensils },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Services", href: "/businesses?type=SERVICE_PROVIDER", icon: Wrench },
] as const;

/**
 * Homepage discovery surface. The primary town photo supplies atmosphere while
 * search and the four routes make the marketplace's next steps immediately clear.
 */
export function HomeHeroSection() {
  const {
    heroImageUrl,
    heroImageFit,
    heroImagePosition,
    platformName,
    townName,
    townPhotos,
    themeLoading,
  } = usePlatformBranding();
  const primaryPhoto = resolveTownPhotoSlides(townPhotos, heroImageUrl)[0];
  const placeLabel = townName || platformName;

  return (
    <section
      aria-label={`${platformName} discovery`}
      className={cn(
        PAGE_CONTAINER,
        "pt-4 pb-2 md:pt-6 md:pb-3",
      )}
    >
      <div className="relative isolate overflow-hidden rounded-[1.5rem] border border-black/[0.05] bg-card px-4 py-5 shadow-[0_8px_32px_-14px_rgba(15,23,42,0.2)] sm:px-6 sm:py-6">
        {primaryPhoto ? (
          <ResponsiveHeroImage
            src={primaryPhoto.url}
            priority
            className={cn(
              "absolute inset-0 -z-20 h-full w-full opacity-35",
              heroImageObjectClasses(heroImageFit, heroImagePosition),
            )}
          />
        ) : null}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-card via-card/95 to-card/55"
          aria-hidden
        />

        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Explore local
          </p>
          <h2 className="mt-1.5 max-w-xl font-serif text-3xl font-bold leading-[1.08] tracking-tight text-platform-heading sm:text-4xl">
            Discover {placeLabel}, close to home.
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Find the shops, food, services, and events that make your town yours.
          </p>
        </div>

        <HomeSearchBar variant="hero" className="mt-5 max-w-2xl" />

        <nav className="mt-4 grid grid-cols-2 gap-2 sm:max-w-2xl sm:grid-cols-4" aria-label="Explore TownHub">
          {QUICK_ROUTES.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group flex min-h-20 items-center gap-3 rounded-2xl border border-black/[0.07] bg-card/85 px-3 py-3 text-left shadow-sm transition-colors hover:bg-background active:scale-[0.98]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} aria-hidden />
              </span>
              <span className="text-sm font-semibold text-platform-heading">
                {label}
              </span>
            </Link>
          ))}
        </nav>

        {themeLoading ? (
          <span className="sr-only">Loading local discovery options</span>
        ) : null}
      </div>
    </section>
  );
}
