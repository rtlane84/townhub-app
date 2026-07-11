export type NavAuthInput = {
  clerkLoaded: boolean;
  isSignedIn: boolean;
  meLoading: boolean;
  role?: string | null;
  status?: string | null;
  activeBusinessCount?: number;
};

export type NavAuthState = {
  authResolved: boolean;
  showPublicNavOnly: boolean;
  isAdmin: boolean;
  isBusinessOwner: boolean;
  hasActiveBusinesses: boolean;
  showBusinessHubNav: boolean;
  showListYourBusinessNav: boolean;
  showMyOrdersNav: boolean;
  isCustomer: boolean;
  isLoggedOut: boolean;
  isAccountDisabled: boolean;
};

export function resolveNavAuthState(input: NavAuthInput): NavAuthState {
  const authResolved = input.clerkLoaded && (!input.isSignedIn || !input.meLoading);

  if (!authResolved) {
    return {
      authResolved: false,
      showPublicNavOnly: true,
      isAdmin: false,
      isBusinessOwner: false,
      hasActiveBusinesses: false,
      showBusinessHubNav: false,
      showListYourBusinessNav: false,
      showMyOrdersNav: false,
      isCustomer: false,
      isLoggedOut: false,
      isAccountDisabled: false,
    };
  }

  const isAccountDisabled = input.isSignedIn && input.status === "DISABLED";

  if (isAccountDisabled) {
    return {
      authResolved: true,
      showPublicNavOnly: true,
      isAdmin: false,
      isBusinessOwner: false,
      hasActiveBusinesses: false,
      showBusinessHubNav: false,
      showListYourBusinessNav: false,
      showMyOrdersNav: false,
      isCustomer: false,
      isLoggedOut: false,
      isAccountDisabled: true,
    };
  }

  const isAdmin = input.role === "ADMIN";
  const isBusinessOwner = input.role === "BUSINESS_OWNER";
  const activeBusinessCount = input.activeBusinessCount ?? 0;
  const hasActiveBusinesses = isBusinessOwner && activeBusinessCount > 0;
  const showBusinessHubNav = isAdmin || hasActiveBusinesses;
  const showListYourBusinessNav = !input.isSignedIn || input.role === "CUSTOMER";
  const showMyOrdersNav =
    input.isSignedIn && !isAdmin && (input.role === "CUSTOMER" || isBusinessOwner);

  return {
    authResolved: true,
    showPublicNavOnly: false,
    isAdmin,
    isBusinessOwner,
    hasActiveBusinesses,
    showBusinessHubNav,
    showListYourBusinessNav,
    showMyOrdersNav,
    isCustomer: input.isSignedIn && !isAdmin && !isBusinessOwner,
    isLoggedOut: !input.isSignedIn,
    isAccountDisabled: false,
  };
}
