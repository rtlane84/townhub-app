/** User can open Business Hub when they are admin or own at least one active business. */
export function canAccessBusinessHub(input: {
  role?: string | null;
  activeBusinessCount: number;
}): boolean {
  if (input.role === "ADMIN") return true;
  if (input.role === "BUSINESS_OWNER") return input.activeBusinessCount > 0;
  return false;
}

/** Show List Your Business nav for guests, customers, and owners without active businesses. */
export function shouldShowListYourBusinessNav(input: {
  isSignedIn: boolean;
  role?: string | null;
  activeBusinessCount: number;
}): boolean {
  if (!input.isSignedIn) return true;
  if (input.role === "CUSTOMER") return true;
  if (input.role === "BUSINESS_OWNER" && input.activeBusinessCount === 0) return true;
  return false;
}
