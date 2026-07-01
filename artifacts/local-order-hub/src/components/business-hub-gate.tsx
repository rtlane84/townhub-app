import { type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { NoActiveBusinessEmptyState } from "@/components/no-active-business-empty-state";

/** Blocks Business Hub routes when the signed-in user owns no active businesses. */
export function BusinessHubGate({ children }: { children: ReactNode }) {
  const { ownedBusinesses, isLoading } = useSelectedBusiness();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
        <Skeleton className="h-8 w-56" />
      </div>
    );
  }

  if (ownedBusinesses.length === 0) {
    return <NoActiveBusinessEmptyState />;
  }

  return <>{children}</>;
}
