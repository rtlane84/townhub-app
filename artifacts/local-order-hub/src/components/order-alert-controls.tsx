import { useCallback, useSyncExternalStore } from "react";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getOrderSoundsEnabled,
  setOrderSoundsEnabled,
} from "@/lib/order-alert-preferences";
import { unlockOrderAlertSound } from "@/lib/order-alert-sound";

const STORAGE_EVENT = "order-sounds-preference-changed";

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSnapshot() {
  return getOrderSoundsEnabled();
}

function notifyPreferenceChange() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function OrderAlertControls({ compact = false }: { compact?: boolean }) {
  const soundsEnabled = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const enableSounds = useCallback(() => {
    setOrderSoundsEnabled(true);
    unlockOrderAlertSound();
    notifyPreferenceChange();
  }, []);

  const disableSounds = useCallback(() => {
    setOrderSoundsEnabled(false);
    notifyPreferenceChange();
  }, []);

  if (compact) {
    return soundsEnabled ? (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground"
        onClick={disableSounds}
        data-testid="disable-order-sounds"
      >
        <BellOff className="h-4 w-4 shrink-0" />
        Disable order sounds
      </Button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={enableSounds}
        data-testid="enable-order-sounds"
      >
        <Volume2 className="h-4 w-4 shrink-0" />
        Enable order sounds
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2" data-testid="order-alert-controls">
      <div className="flex items-center gap-2 text-sm font-medium">
        {soundsEnabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
        Live order alerts
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        New orders show a banner and toast every few seconds. Browsers require one click before sounds can play.
      </p>
      {soundsEnabled ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={disableSounds}
          data-testid="disable-order-sounds"
        >
          <BellOff className="h-4 w-4 mr-2" />
          Disable order sounds
        </Button>
      ) : (
        <Button
          size="sm"
          className="w-full"
          onClick={enableSounds}
          data-testid="enable-order-sounds"
        >
          <Volume2 className="h-4 w-4 mr-2" />
          Enable order sounds
        </Button>
      )}
    </div>
  );
}
