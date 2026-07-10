import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useRegisterDevice } from "@workspace/api-client-react";
import { isNativeApp } from "@/lib/native-platform";
import { initNativePushNotifications } from "@/lib/native-push";

/**
 * After login on a native shell, request push permission and register the
 * device token with the TownHub API.
 */
export function NativePushRegistration() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { mutateAsync } = useRegisterDevice();
  const startedForSession = useRef<string | null>(null);

  useEffect(() => {
    if (!isNativeApp() || !isLoaded || !isSignedIn) {
      startedForSession.current = null;
      return;
    }

    const sessionKey = "signed-in";
    if (startedForSession.current === sessionKey) return;
    startedForSession.current = sessionKey;

    void initNativePushNotifications({
      registerDevice: async (input) => {
        await getToken();
        return mutateAsync({
          data: {
            token: input.token,
            platform: input.platform,
            appVersion: input.appVersion ?? null,
          },
        });
      },
    });
  }, [isLoaded, isSignedIn, getToken, mutateAsync]);

  return null;
}
