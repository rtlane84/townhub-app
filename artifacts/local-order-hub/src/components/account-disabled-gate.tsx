import { type ReactNode } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Skeleton } from "@/components/ui/skeleton";
import { canAccessAuthenticatedAreas } from "@/lib/account-access";

export function AccountDisabledGate({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const meQueryEnabled = clerkLoaded && !!isSignedIn;
  const { data: me, isPending } = useGetMe(undefined, {
    query: {
      enabled: meQueryEnabled,
      queryKey: getGetMeQueryKey(),
    },
  });

  if (!meQueryEnabled) {
    return <>{children}</>;
  }

  if (isPending) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
        <Skeleton className="h-8 w-56" />
      </div>
    );
  }

  if (!canAccessAuthenticatedAreas(me?.status)) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
        <div className="max-w-md text-center space-y-3">
          <h1 className="font-serif text-2xl font-bold">Account disabled</h1>
          <p className="text-sm text-muted-foreground">
            Your TownHub account has been disabled. You can still browse public pages and place guest
            checkout orders, but signed-in access is blocked.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact your platform administrator if you need access restored.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
