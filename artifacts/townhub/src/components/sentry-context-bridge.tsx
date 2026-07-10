import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { isSentryEnabled, Sentry } from "@/lib/sentry";
import { readStoredBusinessId } from "@/lib/business-selection";

/**
 * Attaches safe, non-sensitive context to Sentry events (user id, route, business id).
 */
export function SentryContextBridge() {
  const { userId } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (!isSentryEnabled()) return;

    if (userId) {
      Sentry.setUser({ id: userId });
    } else {
      Sentry.setUser(null);
    }

    Sentry.setTag("route", location);

    const businessId = readStoredBusinessId();
    if (businessId != null) {
      Sentry.setTag("business_id", String(businessId));
    } else {
      Sentry.setTag("business_id", undefined);
    }
  }, [userId, location]);

  return null;
}
