import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativeApp } from "@/lib/native-platform";

export type NativeHapticKind =
  | "selection"
  | "light"
  | "medium"
  | "success"
  | "warning"
  | "error";

async function runHaptic(kind: NativeHapticKind): Promise<void> {
  if (!isNativeApp()) return;

  try {
    switch (kind) {
      case "selection":
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
        break;
      case "light":
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case "medium":
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case "success":
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case "warning":
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case "error":
        await Haptics.notification({ type: NotificationType.Error });
        break;
    }
  } catch {
    // Haptics unavailable — ignore.
  }
}

export function triggerNativeHaptic(kind: NativeHapticKind): void {
  void runHaptic(kind);
}

export function triggerTabChangeHaptic(): void {
  triggerNativeHaptic("selection");
}

export function triggerOrderPlacedHaptic(): void {
  triggerNativeHaptic("success");
}

export function triggerBusinessApprovedHaptic(): void {
  triggerNativeHaptic("success");
}

export function triggerSaveSuccessHaptic(): void {
  triggerNativeHaptic("light");
}

export function triggerPullToRefreshHaptic(): void {
  triggerNativeHaptic("medium");
}
