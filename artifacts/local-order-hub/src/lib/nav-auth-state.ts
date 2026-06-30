export type NavAuthInput = {
  clerkLoaded: boolean;
  isSignedIn: boolean;
  meLoading: boolean;
  role?: string | null;
};

export type NavAuthState = {
  authResolved: boolean;
  showPublicNavOnly: boolean;
  isAdmin: boolean;
  isBusinessOwner: boolean;
  isCustomer: boolean;
  isLoggedOut: boolean;
};

export function resolveNavAuthState(input: NavAuthInput): NavAuthState {
  const authResolved = input.clerkLoaded && (!input.isSignedIn || !input.meLoading);

  if (!authResolved) {
    return {
      authResolved: false,
      showPublicNavOnly: true,
      isAdmin: false,
      isBusinessOwner: false,
      isCustomer: false,
      isLoggedOut: false,
    };
  }

  const isAdmin = input.role === "ADMIN";
  const isBusinessOwner = input.role === "BUSINESS_OWNER";

  return {
    authResolved: true,
    showPublicNavOnly: false,
    isAdmin,
    isBusinessOwner,
    isCustomer: input.isSignedIn && !isAdmin && !isBusinessOwner,
    isLoggedOut: !input.isSignedIn,
  };
}
