import { isNativeApp } from "@/lib/native-platform";
import {
  resolveClerkPublishableKeyForRuntime,
  resolveClerkProxyUrlForRuntime,
} from "@/lib/clerk-config-core";

export {
  resolveClerkPublishableKeyForRuntime,
  resolveClerkProxyUrlForRuntime,
} from "@/lib/clerk-config-core";

/** Clerk publishable key for the current runtime. */
export function resolveClerkPublishableKey(): string {
  return resolveClerkPublishableKeyForRuntime({
    hostname: window.location.hostname,
    envKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    isNative: isNativeApp(),
  });
}

/** Clerk FAPI proxy URL for the current runtime. */
export function resolveClerkProxyUrl(): string | undefined {
  return resolveClerkProxyUrlForRuntime({
    proxyUrl: import.meta.env.VITE_CLERK_PROXY_URL,
    isNative: isNativeApp(),
  });
}
