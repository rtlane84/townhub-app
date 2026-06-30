import { useUser } from "@clerk/react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { resolveNavAuthState } from "@/lib/nav-auth-state";

export function useNavAuthState() {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();

  const meQueryEnabled = clerkLoaded && !!isSignedIn;
  const { data: me, isPending: mePending, isFetching: meFetching } = useGetMe(undefined, {
    query: {
      enabled: meQueryEnabled,
      queryKey: getGetMeQueryKey(),
    },
  });

  const meLoading = meQueryEnabled && (mePending || (meFetching && me == null));

  return resolveNavAuthState({
    clerkLoaded,
    isSignedIn: !!isSignedIn,
    meLoading,
    role: me?.role,
  });
}
