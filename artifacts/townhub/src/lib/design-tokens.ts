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

/** Section vertical rhythm */
export const SECTION_Y = "py-10 md:py-14";

/** Soft pill / chip */
export const PILL =
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide";

/** Icon button circle (header / quick actions) */
export const ICON_BUTTON_CIRCLE =
  "flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] transition-transform active:scale-95";
