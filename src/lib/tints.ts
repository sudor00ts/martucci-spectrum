import type { SpectrumTint } from "@/lib/audio/engine";

export type TintPalette = {
  fill: string;
  line: string;
  alt: string;
  dim: string;
};

export const TINTS: Record<SpectrumTint, TintPalette> = {
  ice: { fill: "#e07030", line: "#f4c09a", alt: "#c4b8a8", dim: "#7a3d1c" },
  forest: { fill: "#5fbf8a", line: "#c6ecd6", alt: "#c4b8a8", dim: "#2f6a4c" },
  ember: { fill: "#c45c3e", line: "#f0c4b4", alt: "#c4b8a8", dim: "#7a3d2e" },
  silver: { fill: "#c5cdd6", line: "#eef1f4", alt: "#e07030", dim: "#5c656e" },
};

export const SNAP_COLORS = ["#e07030", "#c4b8a8", "#d45d5d", "#5fbf8a", "#f4c09a"] as const;

export const ABS_FMIN = 20;
export const ABS_FMAX = 20000;
