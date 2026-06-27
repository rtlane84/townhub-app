let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = audioContext ?? new Ctx();
    return audioContext;
  } catch {
    return null;
  }
}

/** Call from a user gesture so the browser allows audio playback later. */
export function unlockOrderAlertSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    playOrderAlertChime();
  } catch {
    // ignore — visual alerts still work
  }
}

/** Short two-tone chime for a new order. Never throws. */
export function playOrderAlertChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const tones = [
      { freq: 880, start: 0, duration: 0.12 },
      { freq: 1174.66, start: 0.14, duration: 0.18 },
    ];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = tone.freq;
      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + tone.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.duration + 0.05);
    }
  } catch {
    // ignore — visual alerts still work
  }
}
