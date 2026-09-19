import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDb(value: number, digits = 1): string {
  if (!Number.isFinite(value) || value < -90) return "–∞";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export function formatHz(freq: number): string {
  if (freq >= 1000) {
    const k = freq / 1000;
    return k >= 10 ? `${k.toFixed(0)} kHz` : `${k.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} kHz`;
  }
  if (freq >= 100) return `${freq.toFixed(0)} Hz`;
  if (freq >= 10) return `${freq.toFixed(1)} Hz`;
  return `${freq.toFixed(2)} Hz`;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export function freqToNote(freq: number): { name: string; cents: number } | null {
  if (freq < 16 || freq > 8000) return null;
  const midi = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  const cents = Math.round((midi - rounded) * 100);
  return { name: `${name}${octave}`, cents };
}
