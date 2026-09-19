import { forwardRef, useImperativeHandle, useRef } from "react";
import type { AnalyzerFrame } from "@/lib/audio/engine";
import { formatDb } from "@/lib/utils";

export type MeterColumnHandle = { draw: (frame: AnalyzerFrame | null) => void };

function ampFromDb(db: number, dbMin: number) {
  return Math.min(1, Math.max(0, (db - dbMin) / (0 - dbMin)));
}

export const MeterColumn = forwardRef<MeterColumnHandle, { wide: boolean }>(function MeterColumn({ wide }, ref) {
  const peakRef = useRef<HTMLCanvasElement>(null);
  const scopeRef = useRef<HTMLCanvasElement>(null);
  const corrRef = useRef<HTMLDivElement>(null);
  const peakLRef = useRef<HTMLSpanElement>(null);
  const peakRRef = useRef<HTMLSpanElement>(null);
  const rmsLRef = useRef<HTMLSpanElement>(null);
  const rmsRRef = useRef<HTMLSpanElement>(null);
  const lufsMRef = useRef<HTMLSpanElement>(null);
  const lufsSRef = useRef<HTMLSpanElement>(null);
  const lufsIRef = useRef<HTMLSpanElement>(null);
  const corrNumRef = useRef<HTMLSpanElement>(null);
  const frameCount = useRef(0);
  useImperativeHandle(ref, () => ({
    draw(frame) {
      if (!frame || wide) return;
      frameCount.current += 1;
      drawPeakMeters(peakRef.current, frame);
      drawScope(scopeRef.current, frame);
      if (frameCount.current % 2 === 0) {
        if (peakLRef.current) peakLRef.current.textContent = formatDb(frame.peakL);
        if (peakRRef.current) peakRRef.current.textContent = formatDb(frame.peakR);
        if (rmsLRef.current) rmsLRef.current.textContent = formatDb(frame.rmsL);
        if (rmsRRef.current) rmsRRef.current.textContent = formatDb(frame.rmsR);
        if (lufsMRef.current) lufsMRef.current.textContent = formatDb(frame.lufsM, 1);
        if (lufsSRef.current) lufsSRef.current.textContent = formatDb(frame.lufsS, 1);
        if (lufsIRef.current) lufsIRef.current.textContent = formatDb(frame.lufsI, 1);
        if (corrNumRef.current) {
          const c = frame.correlation;
          corrNumRef.current.textContent = `${c >= 0 ? "+" : ""}${c.toFixed(2)}`;
        }
        if (corrRef.current) corrRef.current.style.left = `${((frame.correlation + 1) / 2) * 100}%`;
      }
    },
  }));
  if (wide) return null;
  return (
    <aside className="grid w-full shrink-0 grid-cols-2 gap-3 border-t border-fg/10 bg-surface p-3 md:flex md:w-52 md:flex-col md:border-t-0 md:border-l lg:w-56">
      <section>
        <header className="mb-2 flex items-baseline justify-between">
          <h2 className="text-micro font-medium tracking-wide text-muted uppercase">Nivel</h2>
          <p className="font-mono text-2xs text-subtle">dBFS</p>
        </header>
        <canvas ref={peakRef} className="h-24 w-full md:h-44" />
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-micro tabular-nums">
          <span className="text-subtle">Pico L</span><span ref={peakLRef} className="text-right text-fg">–∞</span>
          <span className="text-subtle">Pico R</span><span ref={peakRRef} className="text-right text-fg">–∞</span>
          <span className="text-subtle">RMS L</span><span ref={rmsLRef} className="text-right text-muted">–∞</span>
          <span className="text-subtle">RMS R</span><span ref={rmsRRef} className="text-right text-muted">–∞</span>
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-micro font-medium tracking-wide text-muted uppercase">LUFS</h2>
        <dl className="grid grid-cols-3 gap-1">
          <div className="rounded-sm bg-inset px-1.5 py-2 text-center"><dt className="text-2xs text-subtle">M</dt><dd ref={lufsMRef} className="font-mono text-sm tabular-nums text-fg">–∞</dd></div>
          <div className="rounded-sm bg-inset px-1.5 py-2 text-center"><dt className="text-2xs text-subtle">S</dt><dd ref={lufsSRef} className="font-mono text-sm tabular-nums text-fg">–∞</dd></div>
          <div className="rounded-sm bg-inset px-1.5 py-2 text-center"><dt className="text-2xs text-subtle">I</dt><dd ref={lufsIRef} className="font-mono text-sm tabular-nums text-fg">–∞</dd></div>
        </dl>
      </section>
      <section className="hidden md:block">
        <h2 className="mb-2 text-micro font-medium tracking-wide text-muted uppercase">Vectorescopio</h2>
        <canvas ref={scopeRef} className="aspect-square w-full rounded-sm bg-inset" />
      </section>
      <section className="col-span-2 md:col-span-1">
        <header className="mb-2 flex items-baseline justify-between">
          <h2 className="text-micro font-medium tracking-wide text-muted uppercase">Correlación</h2>
          <span ref={corrNumRef} className="font-mono text-micro tabular-nums text-fg">+0.00</span>
        </header>
        <div className="relative h-2 overflow-hidden rounded-full bg-inset">
          <div className="absolute inset-y-0 left-1/2 w-px bg-fg/20" />
          <div ref={corrRef} className="absolute top-0 left-1/2 h-full w-2 -translate-x-1/2 rounded-full bg-spectrum" />
        </div>
        <div className="mt-1 flex justify-between font-mono text-2xs text-subtle"><span>−1</span><span>0</span><span>+1</span></div>
      </section>
    </aside>
  );
});

function drawPeakMeters(canvas: HTMLCanvasElement | null, frame: AnalyzerFrame) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 4 || h < 4) return;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const fill = css.getPropertyValue("--color-spectrum").trim() || "#e07030";
  const clip = css.getPropertyValue("--color-clip").trim() || "#d45d5d";
  const muted = css.getPropertyValue("--color-grid-strong").trim() || "rgba(31,28,24,0.12)";
  const dbMin = -60;
  const cols = [{ peak: frame.peakL, rms: frame.rmsL, label: "L" }, { peak: frame.peakR, rms: frame.rmsR, label: "R" }];
  const gap = 10;
  const colW = (w - gap) / 2;
  cols.forEach((col, i) => {
    const x = i * (colW + gap);
    ctx.fillStyle = muted;
    ctx.fillRect(x, 0, colW, h);
    const rmsH = ampFromDb(col.rms, dbMin) * h;
    const peakH = ampFromDb(col.peak, dbMin) * h;
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, fill);
    grad.addColorStop(0.72, fill);
    grad.addColorStop(0.9, "#c4a15a");
    grad.addColorStop(1, clip);
    ctx.fillStyle = grad;
    ctx.fillRect(x, h - rmsH, colW, rmsH);
    ctx.fillStyle = col.peak > -1 ? clip : fill;
    ctx.fillRect(x, h - peakH, colW, 2);
    ctx.fillStyle = css.getPropertyValue("--color-muted").trim() || "#5e5852";
    ctx.font = "500 9px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(col.label, x + colW / 2, h - 6);
  });
}

function drawScope(canvas: HTMLCanvasElement | null, frame: AnalyzerFrame) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 8 || h < 8) return;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  ctx.fillStyle = css.getPropertyValue("--color-inset").trim() || "#090807";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.42;
  ctx.strokeStyle = css.getPropertyValue("--color-grid-strong").trim() || "rgba(31,28,24,0.16)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  ctx.fillStyle = css.getPropertyValue("--color-spectrum").trim() || "#e07030";
  ctx.globalAlpha = 0.55;
  const xy = frame.xy;
  for (let i = 0; i < xy.length; i += 6) {
    const l = xy[i] ?? 0;
    const rr = xy[i + 1] ?? 0;
    const x = cx + (l - rr) * 0.7071 * r * 1.4;
    const y = cy - (l + rr) * 0.7071 * r * 1.4;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
}
