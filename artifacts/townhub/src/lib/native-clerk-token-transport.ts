import { AuthSession } from "@/lib/native-auth-session";
import { isIOS } from "@/lib/native-platform";
import {
  applyNativeClerkRequestAuth,
  rotatedClerkClientToken,
  type ClerkFapiRequest,
  type ClerkFapiResponse,
} from "@/lib/native-clerk-token-transport-core";

export {
  applyNativeClerkRequestAuth,
  rotatedClerkClientToken,
} from "@/lib/native-clerk-token-transport-core";

type BeforeRequestHook = (request: ClerkFapiRequest) => void | Promise<void>;
type AfterResponseHook = (
  request: ClerkFapiRequest,
  response?: ClerkFapiResponse,
) => void | Promise<void>;

declare global {
  interface Window {
    __internal_onBeforeRequest?: BeforeRequestHook;
    __internal_onAfterResponse?: AfterResponseHook;
  }
}

let activeClientToken: string | null = null;

/**
 * Installs Clerk's native request transport before ClerkProvider loads.
 * Clerk rotates a client authorization token on FAPI responses; iOS stores it
 * in Keychain and sends it on the next cold launch to restore the session.
 */
export async function initializeNativeClerkTokenTransport(): Promise<void> {
  if (!isIOS()) return;

  try {
    activeClientToken = (await AuthSession.getClerkClientToken()).token;
  } catch {
    activeClientToken = null;
  }

  window.__internal_onBeforeRequest = (request) => {
    applyNativeClerkRequestAuth(request, activeClientToken);
  };

  window.__internal_onAfterResponse = async (_request, response) => {
    const rotatedToken = rotatedClerkClientToken(response);
    if (!rotatedToken || rotatedToken === activeClientToken) return;
    activeClientToken = rotatedToken;
    try {
      await AuthSession.saveClerkClientToken({ token: rotatedToken });
    } catch {
      // The live Clerk session remains usable; storage can retry on rotation.
    }
  };
}

export async function clearNativeClerkClientToken(): Promise<void> {
  activeClientToken = null;
  if (!isIOS()) return;
  try {
    await AuthSession.clearClerkClientToken();
  } catch {
    // Clerk has already signed out; do not trap the user on storage cleanup.
  }
}
