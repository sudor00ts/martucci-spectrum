import { create } from "zustand";
import type { ChannelView, FftSize, SecondaryMode, SpectrumTint } from "@/lib/audio/engine";
import type { WindowName } from "@/lib/audio/fft";
import { ABS_FMAX, ABS_FMIN } from "@/lib/tints";

export type AnalyzerSettings = {
  fftSize: FftSize;
  windowName: WindowName;
  slope: 0 | 1.5 | 3 | 4.5 | 6;
  smoothing: 0 | 3 | 6 | 12 | 24;
  secondary: SecondaryMode;
  dbMin: -60 | -90 | -120;
  channel: ChannelView;
  tint: SpectrumTint;
  wide: boolean;
  frozen: boolean;
  settingsOpen: boolean;
  zoomMin: number;
  zoomMax: number;
  selectedHz: number | null;
  bandMin: number | null;
  bandMax: number | null;
};

type AnalyzerStore = AnalyzerSettings & {
  setFftSize: (v: FftSize) => void;
  setWindowName: (v: WindowName) => void;
  setSlope: (v: AnalyzerSettings["slope"]) => void;
  setSmoothing: (v: AnalyzerSettings["smoothing"]) => void;
  setSecondary: (v: SecondaryMode) => void;
  setDbMin: (v: AnalyzerSettings["dbMin"]) => void;
  setChannel: (v: ChannelView) => void;
  setTint: (v: SpectrumTint) => void;
  setWide: (v: boolean) => void;
  setFrozen: (v: boolean) => void;
  toggleFrozen: () => void;
  toggleWide: () => void;
  toggleSettings: () => void;
  setZoom: (min: number, max: number) => void;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setSelectedHz: (hz: number | null) => void;
  setBand: (min: number | null, max: number | null) => void;
  zoomToSelection: () => void;
};

function clampRange(min: number, max: number) {
  let lo = Math.max(ABS_FMIN, Math.min(min, max));
  let hi = Math.min(ABS_FMAX, Math.max(min, max));
  if (hi / lo < 1.12) {
    const c = Math.sqrt(lo * hi);
    lo = Math.max(ABS_FMIN, c / Math.sqrt(1.12));
    hi = Math.min(ABS_FMAX, c * Math.sqrt(1.12));
  }
  return { min: lo, max: hi };
}

function scaleAround(min: number, max: number, factor: number, around: number | null) {
  const c = around && around > min && around < max ? around : Math.sqrt(min * max);
  const t = Math.log(c / min) / Math.log(max / min);
  const span = Math.log(max / min) * factor;
  const lo = c / Math.exp(t * span);
  const hi = lo * Math.exp(span);
  return clampRange(lo, hi);
}

const defaults: AnalyzerSettings = {
  fftSize: 4096,
  windowName: "hann",
  slope: 4.5,
  smoothing: 12,
  secondary: "peak",
  dbMin: -90,
  channel: "overlay",
  tint: "ice",
  wide: true,
  frozen: false,
  settingsOpen: false,
  zoomMin: ABS_FMIN,
  zoomMax: ABS_FMAX,
  selectedHz: null,
  bandMin: null,
  bandMax: null,
};

export const useAnalyzerStore = create<AnalyzerStore>()((set, get) => ({
  ...defaults,
  setFftSize: (fftSize) => set({ fftSize }),
  setWindowName: (windowName) => set({ windowName }),
  setSlope: (slope) => set({ slope }),
  setSmoothing: (smoothing) => set({ smoothing }),
  setSecondary: (secondary) => set({ secondary }),
  setDbMin: (dbMin) => set({ dbMin }),
  setChannel: (channel) => set({ channel }),
  setTint: (tint) => set({ tint }),
  setWide: (wide) => set({ wide }),
  setFrozen: (frozen) => set({ frozen }),
  toggleFrozen: () => set((s) => ({ frozen: !s.frozen })),
  toggleWide: () => set((s) => ({ wide: !s.wide })),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  setZoom: (min, max) => {
    const n = clampRange(min, max);
    set({ zoomMin: n.min, zoomMax: n.max });
  },
  resetZoom: () => set({ zoomMin: ABS_FMIN, zoomMax: ABS_FMAX, bandMin: null, bandMax: null }),
  zoomIn: () => {
    const s = get();
    const next = scaleAround(s.zoomMin, s.zoomMax, 0.62, s.selectedHz);
    set({ zoomMin: next.min, zoomMax: next.max });
  },
  zoomOut: () => {
    const s = get();
    const next = scaleAround(s.zoomMin, s.zoomMax, 1.55, s.selectedHz);
    set({ zoomMin: next.min, zoomMax: next.max });
  },
  setSelectedHz: (selectedHz) => set({ selectedHz }),
  setBand: (bandMin, bandMax) => set({ bandMin, bandMax }),
  zoomToSelection: () => {
    const s = get();
    if (s.bandMin != null && s.bandMax != null && s.bandMax > s.bandMin) {
      const next = clampRange(s.bandMin, s.bandMax);
      set({ zoomMin: next.min, zoomMax: next.max, bandMin: null, bandMax: null });
      return;
    }
    if (s.selectedHz != null) {
      const next = scaleAround(s.zoomMin, s.zoomMax, 0.35, s.selectedHz);
      set({ zoomMin: next.min, zoomMax: next.max });
    }
  },
}));
