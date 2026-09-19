import { forwardRef, useImperativeHandle, useRef, type RefObject } from "react";
import type { AnalyzerFrame } from "@/lib/audio/engine";
import { formatDb } from "@/lib/utils";

export type StatsBarHandle = { update: (frame: AnalyzerFrame | null) => void };

export const StatsBar = forwardRef<StatsBarHandle, { wide: boolean }>(function StatsBar({ wide }, ref) {
  const cells = {
    peak: useRef<HTMLSpanElement>(null),
    tp: useRef<HTMLSpanElement>(null),
    rms: useRef<HTMLSpanElement>(null),
    crest: useRef<HTMLSpanElement>(null),
    lufs: useRef<HTMLSpanElement>(null),
    corr: useRef<HTMLSpanElement>(null),
    clip: useRef<HTMLSpanElement>(null),
    sr: useRef<HTMLSpanElement>(null),
  };
  useImperativeHandle(ref, () => ({
    update(frame) {
      if (!frame) return;
      const peak = Math.max(frame.peakL, frame.peakR);
      const tp = Math.max(frame.truePeakL, frame.truePeakR);
      const rms = Math.max(frame.rmsL, frame.rmsR);
      const crest = Math.max(frame.crestL, frame.crestR);
      set(cells.peak, formatDb(peak));
      set(cells.tp, formatDb(tp));
      set(cells.rms, formatDb(rms));
      set(cells.crest, formatDb(crest, 1));
      set(cells.lufs, formatDb(frame.lufsS, 1));
      set(cells.corr, `${frame.correlation >= 0 ? "+" : ""}${frame.correlation.toFixed(2)}`);
      if (cells.clip.current) {
        cells.clip.current.textContent = String(frame.clipCount);
        cells.clip.current.className =
          frame.clipCount > 0 ? "font-mono text-sm tabular-nums text-clip" : "font-mono text-sm tabular-nums text-fg";
      }
      set(cells.sr, `${Math.round(frame.sampleRate / 100) / 10} k`);
    },
  }));
  if (wide) return null;
  return (
    <footer className="grid grid-cols-4 gap-px border-t border-fg/10 bg-fg/10 md:grid-cols-8">
      <Stat label="Pico" nodeRef={cells.peak} />
      <Stat label="True peak" nodeRef={cells.tp} />
      <Stat label="RMS" nodeRef={cells.rms} />
      <Stat label="Cresta" nodeRef={cells.crest} />
      <Stat label="LUFS S" nodeRef={cells.lufs} />
      <Stat label="Corr." nodeRef={cells.corr} />
      <Stat label="Recortes" nodeRef={cells.clip} />
      <Stat label="Sr" nodeRef={cells.sr} />
    </footer>
  );
});

function set(ref: { current: HTMLSpanElement | null }, text: string) {
  if (ref.current) ref.current.textContent = text;
}

function Stat({ label, nodeRef }: { label: string; nodeRef: RefObject<HTMLSpanElement | null> }) {
  return (
    <div className="flex flex-col gap-0.5 bg-surface px-3 py-2.5">
      <span className="text-2xs tracking-wide text-subtle uppercase">{label}</span>
      <span ref={nodeRef} className="font-mono text-sm tabular-nums text-fg">—</span>
    </div>
  );
}
