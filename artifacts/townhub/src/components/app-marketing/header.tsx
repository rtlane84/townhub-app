import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { appMarketingConfig } from "@/lib/app-marketing-config";
import { AppStoreButton } from "@/components/app-marketing/store-buttons";
import { TownhubLogoMark } from "@/components/app-marketing/townhub-logo-mark";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#businesses", label: "For Businesses" },
  { href: "#about", label: "About" },
] as const;

export function AppMarketingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 motion-safe:transition-all motion-safe:duration-300",
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 py-3 md:py-4"
          : "bg-transparent py-5 md:py-6",
      )}
    >
      <div className="container mx-auto px-4 md:px-8 max-w-[1280px] flex items-center justify-between">
        <a
          href="#top"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <TownhubLogoMark sizePx={36} wordmarkClassName="text-2xl" />
        </a>

        <nav className="hidden md:flex items-center gap-8" aria-label="Marketing">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base font-medium text-muted-foreground hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <a
            href={appMarketingConfig.appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-white px-6 py-3 rounded-full text-base font-semibold hover:bg-primary/90 motion-safe:transition-all motion-safe:hover:shadow-md motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Download for iPhone
          </a>
        </div>

        <button
          type="button"
          className="md:hidden p-2 text-primary rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls={menuId}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden /> : <Menu className="w-6 h-6" aria-hidden />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div
          id={menuId}
          className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl p-4 flex flex-col gap-2 z-40"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium px-4 py-3 rounded-xl hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 pb-2 px-2">
            <AppStoreButton className="w-full" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
