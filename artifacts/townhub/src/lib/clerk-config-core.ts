import { publishableKeyFromHost } from "@clerk/react/internal";

export function resolveClerkPublishableKeyForRuntime(options: {
  hostname: string;
  envKey: string | undefined;
  isNative: boolean;
}): string {
  const envKey = options.envKey?.trim();
  if (envKey && options.isNative) {
    return envKey;
  }
  return publishableKeyFromHost(options.hostname, options.envKey);
}

export function resolveClerkProxyUrlForRuntime(options: {
  proxyUrl: string | undefined;
  isNative: boolean;
}): string | undefined {
  const raw = options.proxyUrl;
  if (typeof raw !== "string") return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (options.isNative) return undefined;

  try {
    const url = new URL(trimmed);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return undefined;
    }
    return trimmed;
  } catch {
    return undefined;
  }
}

/**
 * Clerk must not rely on standard browser cookies inside a Capacitor WebView.
 * Native mode lets Clerk use its non-browser session persistence instead.
 */
export function resolveClerkStandardBrowserForRuntime(isNative: boolean): boolean {
  return !isNative;
}
