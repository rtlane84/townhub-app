#!/usr/bin/env node
/**
 * Generates short notification WAV files bundled with the app.
 * Run: node scripts/generate-notification-sounds.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/sounds");

const SAMPLE_RATE = 22050;

/** @typedef {{ freq: number; start: number; duration: number; gain?: number; partials?: number[] }} Tone */

/** @param {Tone[]} tones @param {number} [totalDuration] */
function synthesizeFromTones(tones, totalDuration) {
  const end = totalDuration ?? Math.max(...tones.map((t) => t.start + t.duration)) + 0.05;
  const numSamples = Math.ceil(end * SAMPLE_RATE);
  const samples = new Float32Array(numSamples);

  for (const tone of tones) {
    const partials = tone.partials ?? [1];
    const startSample = Math.floor(tone.start * SAMPLE_RATE);
    const endSample = Math.min(numSamples, Math.floor((tone.start + tone.duration) * SAMPLE_RATE));
    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.008);
      const decay = Math.exp(-3.2 * (t / tone.duration));
      const env = attack * decay;
      let sample = 0;
      for (let p = 0; p < partials.length; p++) {
        const mult = partials[p];
        sample += Math.sin(2 * Math.PI * tone.freq * mult * (i / SAMPLE_RATE)) * (1 / (p + 1));
      }
      samples[i] += sample * (tone.gain ?? 0.3) * env;
    }
  }

  return encodeWav(samples);
}

/** Bell: classic ding-dong service bell (high then lower). */
function bellSound() {
  return synthesizeFromTones([
    { freq: 830, start: 0, duration: 0.22, gain: 0.42, partials: [1, 2.4, 3.8] },
    { freq: 622, start: 0.2, duration: 0.35, gain: 0.38, partials: [1, 2.2, 3.5] },
  ]);
}

/** Chime: quick three-note ascending arpeggio (kitchen pass-through). */
function chimeSound() {
  return synthesizeFromTones([
    { freq: 523.25, start: 0, duration: 0.18, gain: 0.32, partials: [1, 2, 3] },
    { freq: 659.25, start: 0.1, duration: 0.2, gain: 0.3, partials: [1, 2, 3] },
    { freq: 783.99, start: 0.2, duration: 0.28, gain: 0.28, partials: [1, 2, 3] },
  ]);
}

/** Ding: single bright counter bell. */
function dingSound() {
  return synthesizeFromTones([
    { freq: 1046.5, start: 0, duration: 0.45, gain: 0.4, partials: [1, 2.7, 4.1] },
  ]);
}

/** Alert: three urgent beeps. */
function alertSound() {
  return synthesizeFromTones([
    { freq: 880, start: 0, duration: 0.09, gain: 0.38 },
    { freq: 880, start: 0.14, duration: 0.09, gain: 0.38 },
    { freq: 988, start: 0.28, duration: 0.11, gain: 0.4 },
  ], 0.45);
}

function encodeWav(samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

const SOUNDS = {
  bell: bellSound,
  chime: chimeSound,
  ding: dingSound,
  alert: alertSound,
};

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const existing of fs.readdirSync(OUT_DIR)) {
  if (existing.endsWith(".wav")) {
    fs.unlinkSync(path.join(OUT_DIR, existing));
  }
}

for (const [name, build] of Object.entries(SOUNDS)) {
  const wav = build();
  fs.writeFileSync(path.join(OUT_DIR, `${name}.wav`), wav);
  console.log(`Wrote ${name}.wav (${wav.length} bytes)`);
}

console.log(`Done — ${Object.keys(SOUNDS).length} sounds in ${OUT_DIR}`);
