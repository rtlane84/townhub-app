import type { businessesTable } from "@workspace/db";
import { generateNtfyTopic } from "./ntfy-topic";

type BusinessNtfyRow = Pick<
  typeof businessesTable.$inferSelect,
  "ntfyEnabled" | "ntfyTopic" | "ntfyConnectedAt"
>;

export function ntfySettingsForEnable(business: BusinessNtfyRow): {
  ntfyEnabled: true;
  ntfyTopic: string;
  ntfyConnectedAt: Date;
} {
  const topic = business.ntfyTopic?.trim() || generateNtfyTopic();
  return {
    ntfyEnabled: true,
    ntfyTopic: topic,
    ntfyConnectedAt: business.ntfyConnectedAt ?? new Date(),
  };
}

export function ntfySettingsForRegenerate(): {
  ntfyTopic: string;
  ntfyConnectedAt: Date;
} {
  return {
    ntfyTopic: generateNtfyTopic(),
    ntfyConnectedAt: new Date(),
  };
}
