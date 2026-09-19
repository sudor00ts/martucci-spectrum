import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent,
  type WheelEvent,
} from "react";
import type { AnalyzerFrame, AnalyzerSnapshot, ChannelView, SecondaryMode, SpectrumTint } from "@/lib/audio/engine";
import { ABS_FMAX, ABS_FMIN, TINTS } from "@/lib/tints";
import { formatDb, formatHz, freqToNote } from "@/lib/utils";

const CANDIDATE_MARKS = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
];

export type SpectrumCanvasHandle = {
  draw: (frame: AnalyzerFrame | null) => void;
  exportPng: () => void;
  capturePrimary: (frame: AnalyzerFrame) => Float32Array;
};

type Props = {
  channel: ChannelView;
  secondary: SecondaryMode;
  dbMin: number;
  tint: SpectrumTint;
  snapshots: AnalyzerSnapshot[];
  frozen: boolean;
  zoomMin: number;
  zoomMax: number;
  selectedHz: number | null;
  bandMin: number | null;
  bandMax: number | null;
  onSelectHz: (hz: number | null) => void;
  onBand: (min: number | null, max: number | null) => void;
  onZoom: (min: number, max: number) => void;
};

function freqToX(freq: number, w: number, fMin: number, fMax: number) {
  return (Math.log(freq / fMin) / Math.log(fMax / fMin)) * w;
}
function xToFreq(x: number, w: number, fMin: number, fMax: number) {
  const t = Math.min(1, Math.max(0, x / Math.max(1, w)));
  return fMin * (fMax / fMin) ** t;
}
function dbToY(db: number, h: number, dbMin: number, dbMax: number) {
  const t = (db - dbMin) / (dbMax - dbMin);
  return h * (1 - Math.min(1, Math.max(0, t)));
}
function meanDb(a: number, b: number) {
  if (!Number.isFinite(a) && !Number.isFinite(b)) return Number.NEGATIVE_INFINITY;
  if (!Number.isFinite(a)) return b;
  if (!Number.isFinite(b)) return a;
  return 10 * Math.log10((10 ** (a / 10) + 10 ** (b / 10)) / 2);
}
function drawLevelLine(ctx: CanvasRenderingContext2D, y: number, w: number, color: string, dash: number[], label: string) {
  if (!Number.isFinite(y)) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.35;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "600 10px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  const pad = 8;
  const tw = ctx.measureText(label).width;
  const bx = w - tw - pad * 2;
  const by = Math.max(2, y - 15);
  ctx.fillStyle = "rgb(12 11 10 / 0.82)";
  ctx.fillRect(bx, by, tw + pad * 2 - 2, 14);
  ctx.fillStyle = color;
  ctx.fillText(label, w - pad, by + 13);
  ctx.restore();
}
function magAt(mag: Float32Array, sr: number, fftSize: number, freq: number) {
  const bin = (freq * fftSize) / sr;
  const i = Math.floor(bin);
  const frac = bin - i;
  if (i < 0) return mag[0] ?? -140;
  if (i >= mag.length - 1) return mag[mag.length - 1] ?? -140;
  return mag[i] * (1 - frac) + mag[i + 1] * frac;
}
function pickPrimary(frame: AnalyzerFrame, channel: ChannelView) {
  if (channel === "left") return frame.magL;
  if (channel === "right") return frame.magR;
  if (channel === "side") return frame.magS;
  return frame.magM;
}
function pickHold(frame: AnalyzerFrame, channel: ChannelView, secondary: SecondaryMode) {
  if (secondary === "none") return null;
  if (secondary === "max") return channel === "right" ? frame.maxR : frame.maxL;
  if (channel === "left") return frame.holdL;
  if (channel === "right") return frame.holdR;
  return frame.holdM;
}
function strokePath(ctx: CanvasRenderingContext2D, mag: Float32Array, sr: number, fftSize: number, w: number, h: number, dbMin: number, dbMax: number, step: number, fMin: number, fMax: number) {
  ctx.beginPath();
  for (let x = 0; x <= w; x += step) {
    const f = xToFreq(Math.min(x, w), w, fMin, fMax);
    const y = dbToY(magAt(mag, sr, fftSize, f), h, dbMin, dbMax);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}
function fillPath(ctx: CanvasRenderingContext2D, mag: Float32Array, sr: number, fftSize: number, w: number, h: number, dbMin: number, dbMax: number, step: number, fMin: number, fMax: number) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += step) {
    const f = xToFreq(Math.min(x, w), w, fMin, fMax);
    ctx.lineTo(x, dbToY(magAt(mag, sr, fftSize, f), h, dbMin, dbMax));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
}
function marksFor(fMin: number, fMax: number) {
  const ratio = fMax / fMin;
  const filtered = CANDIDATE_MARKS.filter((f) => f >= fMin * 0.95 && f <= fMax * 1.05);
  if (ratio < 8) return filtered;
  const keep = new Set([20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]);
  return filtered.filter((f) => keep.has(f));
}

export const SpectrumCanvas = forwardRef<SpectrumCanvasHandle, Props>(function SpectrumCanvas(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const frameRef = useRef<AnalyzerFrame | null>(null);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; min: number; max: number; t: number } | null>(null);
  const drag = useRef<{ x: number; freq: number; marquee: boolean } | null>(null);
  const lastTap = useRef(0);

  const layout = () => {
    const { w, h } = sizeRef.current;
    const padL = 44, padB = 26, padT = 10, padR = 10;
    return { padL, padB, padT, padR, pw: w - padL - padR, ph: h - padT - padB };
  };

  const paint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    if (w < 8 || h < 8) return;
    const p = propsRef.current;
    const frame = frameRef.current;
    const css = getComputedStyle(document.documentElement);
    const bg = css.getPropertyValue("--color-inset").trim() || "#090807";
    const fg = css.getPropertyValue("--color-fg").trim() || "#1f1c18";
    const muted = css.getPropertyValue("--color-muted").trim() || "#5e5852";
    const subtle = css.getPropertyValue("--color-subtle").trim() || "#8a837a";
    const grid = css.getPropertyValue("--color-grid").trim() || "rgba(31,28,24,0.08)";
    const gridStrong = css.getPropertyValue("--color-grid-strong").trim() || "rgba(31,28,24,0.16)";
    const tint = TINTS[p.tint];
    const dbMax = 6;
    const { padL, padT, pw, ph } = layout();
    const step = pw > 900 ? 1 : pw > 500 ? 1.5 : 2;
    const fMin = p.zoomMin;
    const fMax = p.zoomMax;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(padL, padT);
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    const dbStep = p.dbMin <= -120 ? 12 : p.dbMin <= -90 ? 12 : 6;
    ctx.beginPath();
    for (let db = dbMax; db >= p.dbMin; db -= dbStep) {
      const y = dbToY(db, ph, p.dbMin, dbMax);
      ctx.moveTo(0, y);
      ctx.lineTo(pw, y);
    }
    for (const f of marksFor(fMin, fMax)) {
      const x = freqToX(f, pw, fMin, fMax);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ph);
    }
    ctx.stroke();
    ctx.strokeStyle = gridStrong;
    ctx.beginPath();
    const y0 = dbToY(0, ph, p.dbMin, dbMax);
    ctx.moveTo(0, y0);
    ctx.lineTo(pw, y0);
    ctx.stroke();
    if (p.bandMin != null && p.bandMax != null) {
      const x1 = freqToX(p.bandMin, pw, fMin, fMax);
      const x2 = freqToX(p.bandMax, pw, fMin, fMax);
      ctx.fillStyle = "rgb(224 112 48 / 0.22)";
      ctx.fillRect(Math.min(x1, x2), 0, Math.abs(x2 - x1), ph);
    }
    if (frame) {
      const sr = frame.sampleRate;
      const fft = frame.fftSize;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, pw, ph);
      ctx.clip();
      for (const snap of p.snapshots) {
        ctx.strokeStyle = snap.color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1.25;
        strokePath(ctx, snap.mag, snap.sampleRate, snap.fftSize, pw, ph, p.dbMin, dbMax, step, fMin, fMax);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const hold = pickHold(frame, p.channel, p.secondary);
      if (hold) {
        ctx.strokeStyle = tint.line;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        strokePath(ctx, hold, sr, fft, pw, ph, p.dbMin, dbMax, step, fMin, fMax);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (p.channel === "overlay") {
        const gradR = ctx.createLinearGradient(0, 0, 0, ph);
        gradR.addColorStop(0, tint.alt + "66");
        gradR.addColorStop(1, tint.alt + "10");
        ctx.fillStyle = gradR;
        fillPath(ctx, frame.magR, sr, fft, pw, ph, p.dbMin, dbMax, step, fMin, fMax);
        ctx.fill();
        ctx.strokeStyle = tint.alt;
        ctx.lineWidth = 1.2;
        strokePath(ctx, frame.magR, sr, fft, pw, ph, p.dbMin, dbMax, step, fMin, fMax);
        ctx.stroke();
        const gradL = ctx.createLinearGradient(0, 0, 0, ph);
        gradL.addColorStop(0, tint.fill + "aa");
        gradL.addColorStop(1, tint.fill + "18");
        ctx.fillStyle = gradL;
        fillPath(ctx, frame.magL, sr, fft, pw, ph, p.dbMin, dbMax, step, fMin, fMax);
        ctx.fill();
        ctx.strokeStyle = tint.line;
        ctx.lineWidth = 1.6;
        strokePath(ctx, frame.magL, sr, fft, pw, ph, p.dbMin, dbMax, step, fMin, fMax);
        ctx.stroke();
      } else {
        const primary = pickPrimary(frame, p.channel);
        const grad = ctx.createLinearGradient(0, 0, 0, ph);
        grad.addColorStop(0, tint.fill + "bb");
        grad.addColorStop(1, tint.fill + "18");
        ctx.fillStyle = grad;
        fillPath(ctx, primary, sr, fft, pw, ph, p.dbMin, dbMax, step, fMin, fMax);
        ctx.fill();
        ctx.strokeStyle = tint.line;
        ctx.lineWidth = 1.6;
        strokePath(ctx, primary, sr, fft, pw, ph, p.dbMin, dbMax, step, fMin, fMax);
        ctx.stroke();
      }
      const rmsDb = meanDb(frame.rmsL, frame.rmsR);
      const peakDb = Math.max(frame.peakL, frame.peakR);
      if (Number.isFinite(rmsDb)) drawLevelLine(ctx, dbToY(rmsDb, ph, p.dbMin, dbMax), pw, "rgb(244 192 154 / 0.95)", [5, 4], `RMS ${formatDb(rmsDb)}`);
      if (Number.isFinite(peakDb)) drawLevelLine(ctx, dbToY(peakDb, ph, p.dbMin, dbMax), pw, "rgb(236 232 225 / 0.95)", [], `PK ${formatDb(peakDb)}`);
      ctx.restore();
    }
    ctx.fillStyle = muted;
    ctx.font = "500 10px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let db = dbMax; db >= p.dbMin; db -= dbStep) {
      ctx.fillText(`${db > 0 ? "+" : ""}${db}`, -8, dbToY(db, ph, p.dbMin, dbMax));
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const f of marksFor(fMin, fMax)) {
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, freqToX(f, pw, fMin, fMax), ph + 8);
    }
    const drawCursor = (freq: number, label: boolean) => {
      if (!frame) return;
      const hx = freqToX(freq, pw, fMin, fMax);
      if (hx < 0 || hx > pw) return;
      const primary = p.channel === "overlay" ? frame.magL : pickPrimary(frame, p.channel);
      const db = magAt(primary, frame.sampleRate, frame.fftSize, freq);
      const hy = dbToY(db, ph, p.dbMin, dbMax);
      ctx.strokeStyle = tint.fill;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, ph);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = tint.line;
      ctx.beginPath();
      ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (!label) return;
      const note = freqToNote(freq);
      const lines = [formatHz(freq), `${formatDb(db)} dB`, note ? `${note.name} ${note.cents >= 0 ? "+" : ""}${note.cents}¢` : ""].filter(Boolean);
      ctx.font = "500 11px 'IBM Plex Mono', ui-monospace, monospace";
      const boxW = 112;
      const boxH = 16 * lines.length + 12;
      let bx = hx + 12;
      let by = hy - boxH - 8;
      if (bx + boxW > pw) bx = hx - boxW - 12;
      if (by < 0) by = hy + 12;
      ctx.fillStyle = "rgb(12 11 10 / 0.92)";
      ctx.strokeStyle = "rgb(236 232 225 / 0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillStyle = i === 0 ? fg : muted;
        ctx.fillText(line, bx + 10, by + 8 + i * 16);
      });
    };
    if (p.selectedHz != null) drawCursor(p.selectedHz, true);
    else if (hoverRef.current && frame) {
      const hx = Math.min(pw, Math.max(0, hoverRef.current.x - padL));
      drawCursor(xToFreq(hx, pw, fMin, fMax), true);
    }
    ctx.restore();
    ctx.fillStyle = subtle;
    ctx.font = "500 9px 'IBM Plex Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Hz", padL, h - 14);
    ctx.save();
    ctx.translate(12, padT + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("dBFS", 0, 0);
    ctx.restore();
    if (p.frozen) {
      ctx.fillStyle = tint.fill;
      ctx.font = "600 10px 'Oswald', 'IBM Plex Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("HOLD", w - 16, 14);
    }
  };

  useImperativeHandle(ref, () => ({
    draw(frame) { frameRef.current = frame; paint(); },
    exportPng() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `martucci-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    },
    capturePrimary(frame) {
      const channel = propsRef.current.channel;
      const src = channel === "overlay" || channel === "left" ? frame.magL : pickPrimary(frame, channel);
      return Float32Array.from(src);
    },
  }));

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      paint();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { paint(); });

  const freqAtClient = (clientX: number, target: HTMLCanvasElement) => {
    const rect = target.getBoundingClientRect();
    const { padL, pw } = layout();
    const x = clientX - rect.left - padL;
    const p = propsRef.current;
    return xToFreq(Math.min(pw, Math.max(0, x)), pw, p.zoomMin, p.zoomMax);
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    pointers.current.set(e.pointerId, pt);
    if (pointers.current.size === 2) {
      drag.current = null;
      const pts = [...pointers.current.values()];
      const a = pts[0]!, b = pts[1]!;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const { padL, pw } = layout();
      const cx = (a.x + b.x) / 2 - padL;
      const p = propsRef.current;
      pinch.current = { dist, min: p.zoomMin, max: p.zoomMax, t: Math.min(1, Math.max(0, cx / Math.max(1, pw))) };
      return;
    }
    const now = performance.now();
    if (now - lastTap.current < 280) {
      propsRef.current.onZoom(ABS_FMIN, ABS_FMAX);
      propsRef.current.onBand(null, null);
      lastTap.current = 0;
      drag.current = null;
      return;
    }
    lastTap.current = now;
    drag.current = { x: pt.x, freq: freqAtClient(e.clientX, e.currentTarget), marquee: false };
    hoverRef.current = pt;
    paint();
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, pt);
    hoverRef.current = pt;
    if (pinch.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const a = pts[0]!, b = pts[1]!;
      const dist = Math.max(24, Math.hypot(a.x - b.x, a.y - b.y));
      const start = pinch.current;
      const ratio = Math.min(4, Math.max(0.25, dist / Math.max(24, start.dist)));
      const span = Math.log(start.max / start.min) / ratio;
      const fC = start.min * (start.max / start.min) ** start.t;
      const lo = fC / Math.exp(start.t * span);
      propsRef.current.onZoom(lo, lo * Math.exp(span));
      return;
    }
    const d = drag.current;
    if (d) {
      if (Math.abs(pt.x - d.x) > 14) d.marquee = true;
      if (d.marquee) {
        const f = freqAtClient(e.clientX, e.currentTarget);
        propsRef.current.onBand(Math.min(d.freq, f), Math.max(d.freq, f));
      }
    }
    paint();
  };

  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    if (d && pointers.current.size === 0) {
      if (d.marquee) {
        const f = freqAtClient(e.clientX, e.currentTarget);
        const lo = Math.min(d.freq, f);
        const hi = Math.max(d.freq, f);
        propsRef.current.onBand(lo, hi);
        propsRef.current.onSelectHz(Math.sqrt(lo * hi));
      } else {
        propsRef.current.onSelectHz(d.freq);
        propsRef.current.onBand(null, null);
      }
      drag.current = null;
    }
    if (pointers.current.size === 0) hoverRef.current = null;
    paint();
  };

  const onWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const p = propsRef.current;
    const factor = e.deltaY > 0 ? 1.18 : 0.85;
    const f = freqAtClient(e.clientX, e.currentTarget);
    const t = Math.log(f / p.zoomMin) / Math.log(p.zoomMax / p.zoomMin);
    const span = Math.log(p.zoomMax / p.zoomMin) * factor;
    const lo = f / Math.exp(t * span);
    p.onZoom(lo, lo * Math.exp(span));
  };

  return (
    <div ref={wrapRef} className="relative h-full min-h-48 w-full">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          if (pointers.current.size === 0) {
            hoverRef.current = null;
            paint();
          }
        }}
        onWheel={onWheel}
      />
    </div>
  );
});
