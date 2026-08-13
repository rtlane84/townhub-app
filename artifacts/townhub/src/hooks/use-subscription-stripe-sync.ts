import { useCallback } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetBusinessFeatureAccessQueryKey,
  getGetBusinessBySlugQueryKey,
  getGetMyBusinessQueryKey,
  getGetMySubscriptionQueryKey,
  getListBusinessesQueryKey,
  type BusinessSubscription,
} from "@workspace/api-client-react";
import { resolveApiUrl } from "@/lib/api-base-url";

export type SubscriptionSyncOptions = {
  mock?: boolean;
  planId?: number;
  interval?: "monthly" | "yearly";
};

export function useSubscriptionStripeSync(
  businessId: number | undefined,
  businessSlug?: string,
) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const invalidateBusinessHubQueries = useCallback(
    (id: number) => {
      void queryClient.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: getGetBusinessFeatureAccessQueryKey(id) });
      void queryClient.invalidateQueries({
        queryKey: getGetMyBusinessQueryKey({ businessId: id }),
      });
      void queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey() });
      if (businessSlug) {
        void queryClient.invalidateQueries({
          queryKey: getGetBusinessBySlugQueryKey(businessSlug),
        });
      }
    },
    [businessSlug, queryClient],
  );

  const syncOnce = useCallback(
    async (opts?: SubscriptionSyncOptions): Promise<BusinessSubscription | null> => {
      if (!businessId) return null;

      const token = await getToken();
      const res = await fetch(resolveApiUrl(`/api/businesses/${businessId}/subscription/sync`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          opts?.mock && opts.planId
            ? { mock: true, planId: opts.planId, interval: opts.interval ?? "monthly" }
            : {},
        ),
      });

      const body = (await res.json().catch(() => ({}))) as BusinessSubscription & { error?: string };
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to sync subscription");
      }

      queryClient.setQueryData(getGetMySubscriptionQueryKey(businessId), body);
      return body;
    },
    [businessId, getToken, queryClient],
  );

  return { syncOnce, invalidateBusinessHubQueries };
}
