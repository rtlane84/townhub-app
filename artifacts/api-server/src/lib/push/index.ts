import { createApnsPushProvider } from "./apns-provider";
import { createFcmPushProvider } from "./fcm-provider";
import { createWebPushProvider } from "./web-push-provider";
import type {
  PushDeliveryProvider,
  PushPlatform,
  PushProviderRegistry,
} from "./push-provider";

const providers: PushDeliveryProvider[] = [
  createApnsPushProvider(),
  createFcmPushProvider(),
  createWebPushProvider(),
];

const byPlatform = new Map<PushPlatform, PushDeliveryProvider>();
for (const provider of providers) {
  for (const platform of provider.platforms) {
    byPlatform.set(platform, provider);
  }
}

export const pushProviderRegistry: PushProviderRegistry = {
  getProvider(platform: PushPlatform): PushDeliveryProvider | null {
    return byPlatform.get(platform) ?? null;
  },
  listProviders(): PushDeliveryProvider[] {
    return [...providers];
  },
};

export function getPushProviderForPlatform(
  platform: PushPlatform,
): PushDeliveryProvider | null {
  return pushProviderRegistry.getProvider(platform);
}
