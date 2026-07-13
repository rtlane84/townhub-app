import type { Business } from "@workspace/api-client-react";
import {
  formatBusinessTypeLabel,
  formatTime12h,
  hasOpenHours,
  isAppointmentStorefrontMode,
  isInformationStorefrontMode,
  isOpenNow,
  isOrderingStorefrontMode,
  mobileBusinessPublicLabel,
  normalizeWeeklyHours,
  parseStructuredHours,
} from "@workspace/api-zod";
import { resolveBusinessHours } from "./business-hours";

export type BusinessOpenStatus = {
  isOpen: boolean;
  label: string;
};

/** Storefront summary line: "Open now" + "Closes 8:00 PM" / "Closed" + "Opens at 5:00 AM". */
export type StorefrontStatusLine = {
  isOpen: boolean;
  statusLabel: string;
  scheduleLabel: string | null;
};

export type BusinessListingCta = {
  label: "Order" | "View Menu" | "Book" | "Call";
  href: string;
  external?: boolean;
};

/** Open/closed label for directory cards. Omits status when hours are unknown. */
export function getBusinessOpenStatus(
  business: Pick<
    Business,
    "hours" | "structuredHours" | "hoursEnabled" | "active"
  >,
): BusinessOpenStatus | null {
  const line = getStorefrontStatusLine(business);
  if (!line) {
    if (business.active === false) {
      return { isOpen: false, label: "Closed" };
    }
    return null;
  }
  if (line.scheduleLabel) {
    return {
      isOpen: line.isOpen,
      label: `${line.statusLabel} · ${line.scheduleLabel}`,
    };
  }
  return { isOpen: line.isOpen, label: line.statusLabel };
}

export function getStorefrontStatusLine(
  business: Pick<
    Business,
    "hours" | "structuredHours" | "hoursEnabled" | "active"
  >,
): StorefrontStatusLine | null {
  if (business.active === false) {
    return { isOpen: false, statusLabel: "Closed", scheduleLabel: null };
  }

  const hours = resolveBusinessHours(business);
  if (!hours.hasHours || !hours.structuredHours) {
    return null;
  }

  const parsed = Array.isArray(hours.structuredHours)
    ? normalizeWeeklyHours(hours.structuredHours)
    : parseStructuredHours(hours.structuredHours);
  if (!parsed || !hasOpenHours(parsed)) return null;

  const now = new Date();
  const open = isOpenNow(parsed, now);
  const today = parsed[now.getDay()];

  if (open) {
    return {
      isOpen: true,
      statusLabel: "Open now",
      scheduleLabel: today?.closeTime
        ? `Closes ${formatTime12h(today.closeTime)}`
        : null,
    };
  }

  // Closed now — find next open time today or a later day
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (today && !today.isClosed && today.openTime && today.closeTime) {
    const [openH, openM] = today.openTime.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    if (currentMinutes < openMinutes) {
      return {
        isOpen: false,
        statusLabel: "Closed",
        scheduleLabel: `Opens at ${formatTime12h(today.openTime)}`,
      };
    }
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const dayIndex = (now.getDay() + offset) % 7;
    const day = parsed[dayIndex];
    if (!day?.isClosed && day?.openTime) {
      const weekday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
      ).toLocaleDateString(undefined, { weekday: "short" });
      return {
        isOpen: false,
        statusLabel: "Closed",
        scheduleLabel: `Opens ${weekday} ${formatTime12h(day.openTime)}`,
      };
    }
  }

  return { isOpen: false, statusLabel: "Closed", scheduleLabel: null };
}

/** Short open label for compact list rows. */
export function getBusinessOpenShortLabel(
  business: Pick<
    Business,
    "hours" | "structuredHours" | "hoursEnabled" | "active"
  >,
): BusinessOpenStatus | null {
  const status = getBusinessOpenStatus(business);
  if (!status) return null;
  if (status.isOpen) return { isOpen: true, label: "Open" };
  return { isOpen: false, label: "Closed" };
}

export function getBusinessCategoryLabel(business: Pick<Business, "type">): string {
  return formatBusinessTypeLabel(business.type);
}

/** Food Truck / mobile capability label when mobile mode is on. */
export function getBusinessMobileTag(
  business: Pick<Business, "type"> & {
    isMobileBusiness?: boolean | null;
    eventLocationEnabled?: boolean | null;
  },
): string | null {
  const isMobile =
    business.isMobileBusiness === true || business.eventLocationEnabled === true;
  if (!isMobile) return null;
  return mobileBusinessPublicLabel(business.type);
}

/** Category plus optional mobile tag, e.g. "Restaurant · Food Truck". */
export function getBusinessCategoryLine(
  business: Pick<Business, "type"> & {
    isMobileBusiness?: boolean | null;
    eventLocationEnabled?: boolean | null;
  },
): string {
  const category = getBusinessCategoryLabel(business);
  const mobile = getBusinessMobileTag(business);
  return mobile ? `${category} · ${mobile}` : category;
}

/** Concise capability badges that add info beyond the category label. */
export function getBusinessCapabilityBadges(
  business: Pick<Business, "type"> & {
    storefrontMode?: Business["storefrontMode"];
    orderingEnabled?: boolean | null;
    orderingAvailable?: boolean | null;
    isMobileBusiness?: boolean | null;
    eventLocationEnabled?: boolean | null;
  },
): string[] {
  const badge = getBusinessStorefrontBadge(business);
  return badge ? [badge] : [];
}

/**
 * Storefront capability label for photo badges / list meta.
 * Prefers "Order online" / "Book online" over mobile tags.
 * Advertise capability from storefront mode — don't gate on live windows or toggles.
 */
export function getBusinessStorefrontBadge(
  business: Pick<Business, "type"> & {
    storefrontMode?: Business["storefrontMode"];
    orderingEnabled?: boolean | null;
    orderingAvailable?: boolean | null;
  },
): "Order online" | "Book online" | null {
  if (isOrderingStorefrontMode(business)) {
    return "Order online";
  }
  if (isAppointmentStorefrontMode(business)) {
    return "Book online";
  }
  return null;
}

/**
 * Primary contextual action for directory cards/rows.
 * - Order: ordering storefront mode
 * - Book: appointment storefront mode
 * - View Menu: informational storefront mode
 * - Call: only when none of the above apply and a phone exists
 */
export function getBusinessListingCta(
  business: Pick<
    Business,
    "slug" | "phone" | "type" | "storefrontMode" | "orderingEnabled"
  > & {
    orderingAvailable?: boolean | null;
  },
): BusinessListingCta | null {
  const storefrontHref = `/businesses/${business.slug}`;

  if (isOrderingStorefrontMode(business)) {
    return { label: "Order", href: storefrontHref };
  }

  if (isAppointmentStorefrontMode(business)) {
    return { label: "Book", href: storefrontHref };
  }

  if (isInformationStorefrontMode(business)) {
    return { label: "View Menu", href: storefrontHref };
  }

  const phone = business.phone?.trim();
  if (phone) {
    const digits = phone.replace(/[^\d+]/g, "");
    if (digits) {
      return { label: "Call", href: `tel:${digits}`, external: true };
    }
  }

  return null;
}
