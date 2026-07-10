/** User can open Business Hub when they are admin or own at least one active business. */
export function canAccessBusinessHub(input: {
  role?: string | null;
  activeBusinessCount: number;
}): boolean {
  if (input.role === "ADMIN") return true;
  if (input.role === "BUSINESS_OWNER") return input.activeBusinessCount > 0;
  return false;
}

/** Show List Your Business action for visitors and customers without a business. */
export function shouldShowListYourBusinessNav(input: {
  isSignedIn: boolean;
  role?: string | null;
  activeBusinessCount: number;
}): boolean {
  if (!input.isSignedIn) return true;
  return input.role === "CUSTOMER";
}

/** Show My Orders for signed-in customers and business owners. */
export function shouldShowMyOrdersNav(input: {
  isSignedIn: boolean;
  role?: string | null;
}): boolean {
  if (!input.isSignedIn || input.role === "ADMIN") return false;
  return input.role === "CUSTOMER" || input.role === "BUSINESS_OWNER";
}
