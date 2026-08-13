import type { Business } from "@workspace/api-client-react";
import {
  DEFAULT_PLATFORM_TIMEZONE,
  evaluatePublicAvailability,
  formatBusinessTypeLabel,
  mobileBusinessPublicLabel,
  resolvePublicBrowseMode,
  resolvePlatformTimeZone,
  type PublicAvailabilityResult,
} from "@workspace/api-zod";

export type BusinessOpenStatus = {
  isOpen: boolean;
  label: string;
};

/** Storefront summary line: status + optional schedule timing. */
export type StorefrontStatusLine = {
  isOpen: boolean;
  statusLabel: string;
  scheduleLabel: string | null;
};

export type BusinessListingCta = {
  label: "Order" | "Visit" | "Book" | "Call";
  href: string;
  external?: boolean;
};

type AvailabilityBusiness = Pick<
  Business,
  | "hours"
  | "structuredHours"
  | "hoursEnabled"
  | "active"
  | "isMobileBusiness"
  | "publicAvailability"
> & {
  eventLocationEnabled?: boolean | null;
};

function fromServerSummary(
  summary: NonNullable<Business["publicAvailability"]>,
): StorefrontStatusLine {
  return {
    isOpen: summary.isOpen,
    statusLabel: summary.statusLabel,
    scheduleLabel: summary.scheduleLabel ?? null,
  };
}

/**
 * Prefer server-computed publicAvailability (platform TZ + mobile stops).
 * Fall back to client evaluation when the field is absent (older payloads).
 */
export function getStorefrontStatusLine(
  business: AvailabilityBusiness,
  options?: {
    timeZone?: string | null;
    now?: Date;
    mobileLocations?: Array<{
      locationDate: string;
      startTime?: string | null;
      endTime?: string | null;
      isActive?: boolean | null;
      locationName?: string | null;
    }> | null;
  },
): StorefrontStatusLine | null {
  if (business.publicAvailability) {
    return fromServerSummary(business.publicAvailability);
  }

  const timeZone = resolvePlatformTimeZone(
    options?.timeZone ?? DEFAULT_PLATFORM_TIMEZONE,
  );
  const result: PublicAvailabilityResult = evaluatePublicAvailability(
    {
      active: business.active,
      structuredHours: business.structuredHours,
      hoursEnabled: business.hoursEnabled,
      hours: business.hours,
      isMobileBusiness: business.isMobileBusiness,
      eventLocationEnabled: business.eventLocationEnabled,
      mobileLocations: options?.mobileLocations ?? undefined,
    },
    options?.now ?? new Date(),
    timeZone,
  );

  // Mirror prior null behavior for fixed-location "hours unknown" only when
  // the shared utility says hours are missing and business is active.
  if (
    result.statusLabel === "Hours not provided" &&
    business.active !== false &&
    business.isMobileBusiness !== true &&
    business.eventLocationEnabled !== true
  ) {
    return {
      isOpen: false,
      statusLabel: "Hours not provided",
      scheduleLabel: null,
    };
  }

  return {
    isOpen: result.isOpen,
    statusLabel: result.statusLabel,
    scheduleLabel: result.scheduleLabel,
  };
}

/** Open/closed label for directory cards. Prefers server publicAvailability. */
export function getBusinessOpenStatus(
  business: AvailabilityBusiness,
  options?: { timeZone?: string | null; now?: Date },
): BusinessOpenStatus | null {
  const line = getStorefrontStatusLine(business, options);
  if (!line) {
    if (business.active === false) {
      return { isOpen: false, label: "Closed" };
    }
    return null;
  }
  // Directory cards show status alone; timing is a separate line in layouts.
  return { isOpen: line.isOpen, label: line.statusLabel };
}

/** Short open label for compact list rows. */
export function getBusinessOpenShortLabel(
  business: AvailabilityBusiness,
  options?: { timeZone?: string | null; now?: Date },
): BusinessOpenStatus | null {
  const status = getBusinessOpenStatus(business, options);
  if (!status) return null;
  if (status.isOpen) return { isOpen: true, label: "Open" };
  if (status.label === "Hours not provided") return status;
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
    onlineOrderingEntitled?: boolean | null;
    appointmentRequestsEntitled?: boolean | null;
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
    onlineOrderingEntitled?: boolean | null;
    appointmentRequestsEntitled?: boolean | null;
    orderingEnabled?: boolean | null;
    orderingAvailable?: boolean | null;
  },
): "Order online" | "Book online" | null {
  const mode = resolvePublicBrowseMode(business);
  if (mode === "ORDERING") {
    return "Order online";
  }
  if (mode === "APPOINTMENT") {
    return "Book online";
  }
  return null;
}

/**
 * Primary contextual action for directory cards/rows.
 * - Order: ordering storefront mode
 * - Book: appointment storefront mode
 * - Visit: informational (display-only) storefront mode
 * - Call: only when none of the above apply and a phone exists
 */
export function getBusinessListingCta(
  business: Pick<
    Business,
    | "slug"
    | "phone"
    | "type"
    | "storefrontMode"
    | "onlineOrderingEntitled"
    | "appointmentRequestsEntitled"
    | "orderingEnabled"
  > & {
    orderingAvailable?: boolean | null;
  },
): BusinessListingCta | null {
  const storefrontHref = `/businesses/${business.slug}`;
  const mode = resolvePublicBrowseMode(business);

  if (mode === "ORDERING") {
    return { label: "Order", href: storefrontHref };
  }

  if (mode === "APPOINTMENT") {
    return { label: "Book", href: storefrontHref };
  }

  if (mode === "INFORMATION") {
    return { label: "Visit", href: storefrontHref };
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
