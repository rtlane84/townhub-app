const CHIME_PATH = "/sounds/chime.wav";

let audioUnlocked = false;
let chimeAudio: HTMLAudioElement | null = null;

function resolveBasePath(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function getChimeAudio(): HTMLAudioElement | null {
  try {
    if (chimeAudio) return chimeAudio;
    chimeAudio = new Audio(`${resolveBasePath()}${CHIME_PATH}`);
    chimeAudio.preload = "auto";
    return chimeAudio;
  } catch {
    return null;
  }
}

/** Call from a user gesture so the browser allows audio playback later. */
export function unlockNotificationSound(): void {
  audioUnlocked = true;
  void playNotificationSound(0.01);
}

export function isNotificationSoundUnlocked(): boolean {
  return audioUnlocked;
}

/** Play the notification chime. Never throws. */
export function playNotificationSound(volumePercent = 80): void {
  try {
    const audio = getChimeAudio();
    if (!audio) return;

    const volume = Math.max(0, Math.min(1, volumePercent / 100));
    audio.volume = volume;
    audio.currentTime = 0;

    const playPromise = audio.play();
    if (playPromise) {
      void playPromise.catch(() => {
        // autoplay blocked until user interaction
      });
    }
  } catch {
    // visual alerts still work
  }
}
