import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";
import { isNativeApp } from "@/lib/native-platform";
import { resolveNativeDeepLinkToAppUrl } from "@/lib/native-oauth";

export type PushPlatform = "IOS" | "ANDROID" | "WEB";

export function nativePushPlatform(): PushPlatform | null {
  if (!isNativeApp()) return null;
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return "IOS";
  if (platform === "android") return "ANDROID";
  return null;
}

export type RegisterDeviceFn = (input: {
  token: string;
  platform: PushPlatform;
  appVersion?: string | null;
}) => Promise<unknown>;

export type UnregisterDeviceFn = (input: {
  token?: string;
  all?: boolean;
}) => Promise<unknown>;

let currentToken: string | null = null;
let listenersAttached = false;
let registerFn: RegisterDeviceFn | null = null;

export function getCurrentPushToken(): string | null {
  return currentToken;
}

function navigateToDeepLink(raw: string | undefined): void {
  if (!raw?.trim()) return;
  const value = raw.trim();
  const origin = window.location.origin;
  const next = /^https?:\/\//i.test(value) || value.startsWith("townhub://")
    ? resolveNativeDeepLinkToAppUrl(value, origin)
    : `${origin}${value.startsWith("/") ? value : `/${value}`}`;

  if (next !== window.location.href) {
    window.location.assign(next);
  }
}

function deepLinkFromNotificationData(
  data: Record<string, unknown> | undefined,
): string | undefined {
  if (!data) return undefined;
  const deepLink = data.deepLink ?? data.deep_link ?? data.url;
  return typeof deepLink === "string" ? deepLink : undefined;
}

/**
 * Attach Capacitor push listeners once. Call after the user is signed in
 * and an authenticated registerDevice API function is available.
 */
export async function initNativePushNotifications(options: {
  registerDevice: RegisterDeviceFn;
  onPermissionDenied?: () => void;
}): Promise<void> {
  if (!isNativeApp()) return;

  registerFn = options.registerDevice;
  const platform = nativePushPlatform();
  if (!platform) return;

  if (!listenersAttached) {
    listenersAttached = true;

    await PushNotifications.addListener("registration", (token) => {
      currentToken = token.value;
      void (async () => {
        if (!registerFn || !currentToken) return;
        let appVersion: string | null = null;
        try {
          const info = await App.getInfo();
          appVersion = info.version ?? null;
        } catch {
          // ignore
        }
        try {
          await registerFn({
            token: currentToken,
            platform,
            appVersion,
          });
        } catch {
          // Registration can retry on next launch / login.
        }
      })();
    });

    await PushNotifications.addListener("registrationError", () => {
      // Permission or APNs registration failure — non-fatal.
    });

    await PushNotifications.addListener("pushNotificationReceived", () => {
      // Foreground delivery — in-app toasts already cover Business Hub.
    });

    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        const data = action.notification.data as Record<string, unknown> | undefined;
        navigateToDeepLink(deepLinkFromNotificationData(data));
      },
    );
  }

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") {
    options.onPermissionDenied?.();
    return;
  }

  await PushNotifications.register();
}

/** Unregister the current device token with the backend (call before sign-out). */
export async function unregisterNativePushDevice(
  unregisterDevice: UnregisterDeviceFn,
): Promise<void> {
  if (!isNativeApp()) return;
  const token = currentToken;
  try {
    if (token) {
      await unregisterDevice({ token });
    }
  } catch {
    // Best-effort cleanup.
  } finally {
    currentToken = null;
  }
}

/** @internal test helper */
export function __resetNativePushStateForTests(): void {
  currentToken = null;
  listenersAttached = false;
  registerFn = null;
}
