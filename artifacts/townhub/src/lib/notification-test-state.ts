export type NotificationProviderKey = "email" | "sms" | "discord";

export type ProviderTestSnapshot = {
  lastSuccessAt: string | null;
  lastError: string | null;
};

const STORAGE_PREFIX = "local-order-hub:notification-test:";

function storageKey(businessId: number, provider: NotificationProviderKey): string {
  return `${STORAGE_PREFIX}${businessId}:${provider}`;
}

function readSnapshot(businessId: number, provider: NotificationProviderKey): ProviderTestSnapshot {
  try {
    const raw = localStorage.getItem(storageKey(businessId, provider));
    if (!raw) return { lastSuccessAt: null, lastError: null };
    const parsed = JSON.parse(raw) as Partial<ProviderTestSnapshot>;
    return {
      lastSuccessAt: parsed.lastSuccessAt ?? null,
      lastError: parsed.lastError ?? null,
    };
  } catch {
    return { lastSuccessAt: null, lastError: null };
  }
}

function writeSnapshot(
  businessId: number,
  provider: NotificationProviderKey,
  snapshot: ProviderTestSnapshot,
): void {
  try {
    localStorage.setItem(storageKey(businessId, provider), JSON.stringify(snapshot));
  } catch {
    // ignore storage failures
  }
}

export function recordProviderTestSuccess(businessId: number, provider: NotificationProviderKey): void {
  writeSnapshot(businessId, provider, {
    lastSuccessAt: new Date().toISOString(),
    lastError: null,
  });
}

export function recordProviderTestFailure(
  businessId: number,
  provider: NotificationProviderKey,
  error: string,
): void {
  const current = readSnapshot(businessId, provider);
  writeSnapshot(businessId, provider, {
    ...current,
    lastError: error,
  });
}

export function getProviderTestSnapshot(
  businessId: number,
  provider: NotificationProviderKey,
): ProviderTestSnapshot {
  return readSnapshot(businessId, provider);
}

export type ConnectionDisplayStatus = "not_tested" | "connected" | "failed";

export function resolveConnectionDisplay(input: {
  lastSuccessAt: string | Date | null | undefined;
  lastError: string | null | undefined;
}): {
  status: ConnectionDisplayStatus;
  lastSuccessAt: Date | null;
  failureReason: string | null;
} {
  if (input.lastError?.trim()) {
    return {
      status: "failed",
      lastSuccessAt: input.lastSuccessAt ? new Date(input.lastSuccessAt) : null,
      failureReason: input.lastError.trim(),
    };
  }

  if (input.lastSuccessAt) {
    return {
      status: "connected",
      lastSuccessAt: new Date(input.lastSuccessAt),
      failureReason: null,
    };
  }

  return {
    status: "not_tested",
    lastSuccessAt: null,
    failureReason: null,
  };
}

import { format } from "date-fns";

export function formatLastSuccessfulTest(at: Date): string {
  return format(at, "MMMM d, yyyy • h:mm a");
}
