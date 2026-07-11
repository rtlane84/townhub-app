/**
 * Push delivery provider abstraction.
 *
 * Platform-specific adapters (APNs, FCM, Web Push) implement this interface.
 * The notification pipeline never talks to APNs/FCM directly.
 */

export type PushPlatform = "IOS" | "ANDROID" | "WEB";

export type PushMessage = {
  title: string;
  body: string;
  /** App-relative deep link path, e.g. `/dashboard/business/orders/42`. */
  deepLink: string;
  /** String-only data payload for client routing. */
  data?: Record<string, string>;
  /** Optional APNs / FCM collapse key. */
  collapseKey?: string;
  /** Optional badge count (iOS). */
  badge?: number;
  sound?: string;
};

export type PushTarget = {
  token: string;
  platform: PushPlatform;
  userId: string;
};

export type PushSendResult = {
  token: string;
  platform: PushPlatform;
  userId: string;
  status: "SENT" | "FAILED" | "LOGGED" | "INVALID_TOKEN";
  error?: string;
  providerMessageId?: string;
};

export interface PushDeliveryProvider {
  readonly id: string;
  readonly platforms: readonly PushPlatform[];
  isConfigured(): boolean;
  send(targets: PushTarget[], message: PushMessage): Promise<PushSendResult[]>;
}

export type PushProviderRegistry = {
  getProvider(platform: PushPlatform): PushDeliveryProvider | null;
  listProviders(): PushDeliveryProvider[];
};
