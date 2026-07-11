/**
 * Shared design-system class tokens for TownHub's premium Apple-quality UI.
 * Prefer these over ad-hoc shadow/radius strings so web + native stay cohesive.
 */

/** Soft elevated card — default listing / info surface */
export const CARD_ELEVATION =
  "border-0 bg-card shadow-[0_2px_24px_-6px_rgba(15,23,42,0.1),0_1px_3px_rgba(15,23,42,0.04)]";

/** Stronger elevation for hero / featured surfaces */
export const CARD_ELEVATION_HERO =
  "border-0 bg-card shadow-[0_8px_40px_-12px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.05)]";

/** Interactive card press + hover */
export const CARD_INTERACTIVE =
  "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-10px_rgba(15,23,42,0.16)] active:translate-y-0 active:scale-[0.985] native-pressable";

/** Standard listing card shell */
export const LISTING_CARD_CLASS = `h-full cursor-pointer overflow-hidden rounded-[1.75rem] group ${CARD_ELEVATION} ${CARD_INTERACTIVE}`;

/** Page content container */
export const PAGE_CONTAINER = "container mx-auto max-w-7xl px-5 sm:px-6";

/** Section vertical rhythm — tighter on mobile for native density */
export const SECTION_Y = "py-7 md:py-12";

/** Soft pill / chip */
export const PILL =
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide";

/** Icon button circle (header / quick actions) */
export const ICON_BUTTON_CIRCLE =
  "flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] transition-transform active:scale-95";

/** Dashboard sidebar shell */
export const DASHBOARD_SIDEBAR =
  "w-64 shrink-0 border-r border-black/[0.04] bg-card/70 backdrop-blur-sm hidden md:block";

/** Dashboard nav link — idle */
export const DASHBOARD_NAV_IDLE =
  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground";

/** Dashboard nav link — active */
export const DASHBOARD_NAV_ACTIVE =
  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_rgba(30,58,138,0.45)]";

/** Dashboard main canvas */
export const DASHBOARD_MAIN =
  "flex-1 overflow-x-hidden bg-[hsl(var(--background))]";
