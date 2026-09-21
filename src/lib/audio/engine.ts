import {
  RealFFT,
  applySlope,
  applyWindow,
  fill,
  magnitudesDb,
  makeSmoothSpans,
  makeWindow,
  maxHold,
  midSideDb,
  octaveSmooth,
  peakHold,
  type WindowName,
} from "@/lib/audio/fft";
import { connectFileBuffer, createDemoBuffer } from "@/lib/audio/demo";

export type SourceKind = "idle" | "demo" | "mic" | "file";
export type ChannelView = "sum" | "left" | "right" | "mid" | "side" | "overlay";
export type SecondaryMode = "none" | "peak" | "max";
export type SpectrumTint = "ice" | "forest" | "ember" | "silver";
export type FftSize = 2048 | 4096 | 8192 | 16384;

export type EngineSettings = {
  fftSize: FftSize;
  windowName: WindowName;
  slope: 0 | 1.5 | 3 | 4.5 | 6;
  smoothing: 0 | 3 | 6 | 12 | 24;
  secondary: SecondaryMode;
};

export type AnalyzerSnapshot = {
  id: string;
  name: string;
  color: string;
  gainDb: number;
  mag: Float32Array;
  sampleRate: number;
  fftSize: number;
};

export type AnalyzerFrame = {
  sampleRate: number;
  fftSize: number;
  binCount: number;
  magL: Float32Array;
  magR: Float32Array;
  magM: Float32Array;
  magS: Float32Array;
  holdL: Float32Array;
  holdR: Float32Array;
  holdM: Float32Array;
  maxL: Float32Array;
  maxR: Float32Array;
  peakL: number;
  peakR: number;
  rmsL: number;
  rmsR: number;
  truePeakL: number;
  truePeakR: number;
  lufsM: number;
  lufsS: number;
  lufsI: number;
  correlation: number;
  clipCount: number;
  crestL: number;
  crestR: number;
  xy: Float32Array;
  xyLen: number;
  running: boolean;
  source: SourceKind;
};

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number; z1: number; z2: number };
function biquad(b0: number, b1: number, b2: number, a1: number, a2: number): Biquad {
  return { b0, b1, b2, a1, a2, z1: 0, z2: 0 };
}
function runBiquad(f: Biquad, x: number) {
  const y = f.b0 * x + f.z1;
  f.z1 = f.b1 * x - f.a1 * y + f.z2;
  f.z2 = f.b2 * x - f.a2 * y;
  return y;
}
function kFilters() {
  return {
    shelf: biquad(1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585),
    hp: biquad(1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621),
  };
}
function dbFromAmp(amp: number) {
  return 20 * Math.log10(Math.max(amp, 1e-12));
}

export class AudioEngine {
  onFrame: ((frame: AnalyzerFrame) => void) | null = null;
  private ctx: AudioContext | null = null;
  private analyserL: AnalyserNode | null = null;
  private analyserR: AnalyserNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private inputGain: GainNode | null = null;
  private silent: GainNode | null = null;
  private sourceNode: AudioNode | null = null;
  private mediaStream: MediaStream | null = null;
  private stopSource: (() => void) | null = null;
  private fftL: RealFFT;
  private fftR: RealFFT;
  private window: Float32Array;
  private windowSum: number;
  private timeL: Float32Array<ArrayBuffer>;
  private timeR: Float32Array<ArrayBuffer>;
  private winL: Float32Array;
  private winR: Float32Array;
  private magL: Float32Array;
  private magR: Float32Array;
  private magM: Float32Array;
  private magS: Float32Array;
  private workL: Float32Array;
  private workR: Float32Array;
  private holdL: Float32Array;
  private holdR: Float32Array;
  private holdM: Float32Array;
  private maxL: Float32Array;
  private maxR: Float32Array;
  private smoothStart: Int16Array;
  private smoothEnd: Int16Array;
  private peakL = 0;
  private peakR = 0;
  private rms2L = 0;
  private rms2R = 0;
  private truePeakL = 0;
  private truePeakR = 0;
  private corrNum = 0;
  private corrDenL = 0;
  private corrDenR = 0;
  private clipCount = 0;
  private msM = 1e-12;
  private msS = 1e-12;
  private msI = 1e-12;
  private kL = kFilters();
  private kR = kFilters();
  private xy = new Float32Array(4096);
  private xyWrite = 0;
  private raf = 0;
  private lastTs = 0;
  private frozen = false;
  private source: SourceKind = "idle";
  private fileName: string | null = null;
  private settings: EngineSettings;
  private disposed = false;
  private outputGain = 0.78;
  private muted = false;

  constructor(settings: EngineSettings) {
    this.settings = settings;
    this.fftL = new RealFFT(settings.fftSize);
    this.fftR = new RealFFT(settings.fftSize);
    const w = makeWindow(settings.fftSize, settings.windowName);
    this.window = w.window;
    this.windowSum = w.sum;
    this.timeL = new Float32Array(settings.fftSize);
    this.timeR = new Float32Array(settings.fftSize);
    this.winL = new Float32Array(settings.fftSize);
    this.winR = new Float32Array(settings.fftSize);
    const n2 = settings.fftSize / 2;
    this.magL = new Float32Array(n2);
    this.magR = new Float32Array(n2);
    this.magM = new Float32Array(n2);
    this.magS = new Float32Array(n2);
    this.workL = new Float32Array(n2);
    this.workR = new Float32Array(n2);
    this.holdL = new Float32Array(n2);
    this.holdR = new Float32Array(n2);
    this.holdM = new Float32Array(n2);
    this.maxL = new Float32Array(n2);
    this.maxR = new Float32Array(n2);
    fill(this.holdL, -140);
    fill(this.holdR, -140);
    fill(this.holdM, -140);
    fill(this.maxL, -140);
    fill(this.maxR, -140);
    const spans = makeSmoothSpans(n2, 48000, settings.fftSize, settings.smoothing ? 1 / settings.smoothing : 0);
    this.smoothStart = spans.start;
    this.smoothEnd = spans.end;
  }

  getSource() { return this.source; }
  getFileName() { return this.fileName; }
  isRunning() { return this.ctx?.state === "running"; }

  async resume() {
    if (!this.ctx) await this.ensureContext();
    if (this.ctx && this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* user gesture required */ }
    }
    await this.primeOutput();
  }

  async primeOutput() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 0.00008;
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch { /* ignore */ }
    try {
      const el = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
      el.volume = 0.01;
      await el.play();
      el.pause();
    } catch { /* still blocked until tap */ }
  }

  setOutputGain(value: number) {
    this.outputGain = Math.min(1, Math.max(0, value));
    this.applyMonitor();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyMonitor();
  }

  setFrozen(frozen: boolean) { this.frozen = frozen; }

  resetHolds() {
    fill(this.holdL, -140);
    fill(this.holdR, -140);
    fill(this.holdM, -140);
    fill(this.maxL, -140);
    fill(this.maxR, -140);
    this.clipCount = 0;
    this.msI = 1e-12;
    this.truePeakL = 0;
    this.truePeakR = 0;
  }

  configure(next: EngineSettings) {
    const sizeChanged = next.fftSize !== this.settings.fftSize;
    const winChanged = next.windowName !== this.settings.windowName;
    const smoothChanged = next.smoothing !== this.settings.smoothing;
    this.settings = next;
    if (sizeChanged) {
      this.fftL = new RealFFT(next.fftSize);
      this.fftR = new RealFFT(next.fftSize);
      this.timeL = new Float32Array(next.fftSize);
      this.timeR = new Float32Array(next.fftSize);
      this.winL = new Float32Array(next.fftSize);
      this.winR = new Float32Array(next.fftSize);
      const n2 = next.fftSize / 2;
      this.magL = new Float32Array(n2);
      this.magR = new Float32Array(n2);
      this.magM = new Float32Array(n2);
      this.magS = new Float32Array(n2);
      this.workL = new Float32Array(n2);
      this.workR = new Float32Array(n2);
      this.holdL = new Float32Array(n2);
      this.holdR = new Float32Array(n2);
      this.holdM = new Float32Array(n2);
      this.maxL = new Float32Array(n2);
      this.maxR = new Float32Array(n2);
      fill(this.holdL, -140); fill(this.holdR, -140); fill(this.holdM, -140); fill(this.maxL, -140); fill(this.maxR, -140);
      if (this.analyserL) this.analyserL.fftSize = next.fftSize;
      if (this.analyserR) this.analyserR.fftSize = next.fftSize;
    }
    if (sizeChanged || winChanged) {
      const w = makeWindow(next.fftSize, next.windowName);
      this.window = w.window;
      this.windowSum = w.sum;
    }
    if (sizeChanged || smoothChanged) {
      const sr = this.ctx?.sampleRate ?? 48000;
      const n2 = next.fftSize / 2;
      const spans = makeSmoothSpans(n2, sr, next.fftSize, next.smoothing ? 1 / next.smoothing : 0);
      this.smoothStart = spans.start;
      this.smoothEnd = spans.end;
    }
  }

  capturePrimary(): Float32Array {
    const copy = new Float32Array(this.magM.length);
    copy.set(this.magM);
    return copy;
  }

  async startDemo() {
    await this.ensureContext();
    if (!this.ctx || !this.inputGain) return;
    this.clearInput();
    const buffer = createDemoBuffer(this.ctx);
    const handle = connectFileBuffer(this.ctx, buffer, this.inputGain);
    this.stopSource = handle.stop;
    this.source = "demo";
    this.fileName = null;
    this.setMonitor("demo");
    await this.resume();
  }

  async startMic() {
    await this.ensureContext();
    if (!this.ctx || !this.inputGain) throw new Error("Audio no disponible");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2 },
    });
    this.clearInput();
    this.mediaStream = stream;
    const src = this.ctx.createMediaStreamSource(stream);
    src.connect(this.inputGain);
    this.sourceNode = src;
    this.source = "mic";
    this.fileName = null;
    this.setMonitor("mic");
    await this.resume();
  }

  async startFile(file: File) {
    await this.ensureContext();
    if (!this.ctx || !this.inputGain) throw new Error("Audio no disponible");
    const buf = await file.arrayBuffer();
    const decoded = await this.ctx.decodeAudioData(buf.slice(0));
    this.clearInput();
    const handle = connectFileBuffer(this.ctx, decoded, this.inputGain);
    this.stopSource = handle.stop;
    this.source = "file";
    this.fileName = file.name;
    this.setMonitor("file");
    await this.resume();
  }

  stop() {
    this.clearInput();
    this.source = "idle";
    this.fileName = null;
    this.setMonitor("idle");
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.clearInput();
    void this.ctx?.close();
    this.ctx = null;
  }

  private setMonitor(kind: SourceKind) {
    if (!this.silent) return;
    const live = kind === "demo" || kind === "file";
    this.silent.gain.value = live && !this.muted ? this.outputGain : 0;
  }

  private applyMonitor() {
    this.setMonitor(this.source);
  }

  private clearInput() {
    this.stopSource?.();
    this.stopSource = null;
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch { /* noop */ }
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
      this.mediaStream = null;
    }
  }

  private async ensureContext() {
    if (this.ctx) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    const fftSize = this.settings.fftSize;
    this.inputGain = this.ctx.createGain();
    this.inputGain.gain.value = 1;
    this.splitter = this.ctx.createChannelSplitter(2);
    this.analyserL = this.ctx.createAnalyser();
    this.analyserR = this.ctx.createAnalyser();
    this.analyserL.fftSize = fftSize;
    this.analyserR.fftSize = fftSize;
    this.analyserL.smoothingTimeConstant = 0;
    this.analyserR.smoothingTimeConstant = 0;
    this.silent = this.ctx.createGain();
    this.silent.gain.value = 0;
    this.inputGain.connect(this.splitter);
    this.splitter.connect(this.analyserL, 0);
    this.splitter.connect(this.analyserR, 1);
    this.inputGain.connect(this.silent);
    this.silent.connect(this.ctx.destination);
    const n2 = fftSize / 2;
    const spans = makeSmoothSpans(n2, this.ctx.sampleRate, fftSize, this.settings.smoothing ? 1 / this.settings.smoothing : 0);
    this.smoothStart = spans.start;
    this.smoothEnd = spans.end;
    this.lastTs = performance.now();
    const loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      this.process();
    };
    this.raf = requestAnimationFrame(loop);
  }

  private process() {
    if (!this.analyserL || !this.analyserR || !this.ctx) return;
    const now = performance.now();
    const dt = Math.min(0.08, Math.max(0.008, (now - this.lastTs) / 1000));
    this.lastTs = now;
    this.analyserL.getFloatTimeDomainData(this.timeL);
    this.analyserR.getFloatTimeDomainData(this.timeR);
    let rPeak = 0;
    for (let i = 0; i < this.timeR.length; i += 8) rPeak = Math.max(rPeak, Math.abs(this.timeR[i] ?? 0));
    if (rPeak < 1e-5) this.timeR.set(this.timeL);
    this.updateMeters(dt);
    if (!this.frozen) {
      applyWindow(this.winL, this.timeL, this.window);
      applyWindow(this.winR, this.timeR, this.window);
      this.fftL.forward(this.winL);
      this.fftR.forward(this.winR);
      const scale = 2 / this.windowSum;
      magnitudesDb(this.fftL, this.workL, scale);
      magnitudesDb(this.fftR, this.workR, scale);
      midSideDb(this.fftL, this.fftR, this.magM, this.magS, scale);
      const sr = this.ctx.sampleRate;
      const size = this.settings.fftSize;
      applySlope(this.workL, sr, size, this.settings.slope);
      applySlope(this.workR, sr, size, this.settings.slope);
      applySlope(this.magM, sr, size, this.settings.slope);
      applySlope(this.magS, sr, size, this.settings.slope);
      if (this.settings.smoothing > 0) {
        octaveSmooth(this.workL, this.magL, this.smoothStart, this.smoothEnd);
        octaveSmooth(this.workR, this.magR, this.smoothStart, this.smoothEnd);
        const tmpM = this.workL;
        const tmpS = this.workR;
        tmpM.set(this.magM);
        tmpS.set(this.magS);
        octaveSmooth(tmpM, this.magM, this.smoothStart, this.smoothEnd);
        octaveSmooth(tmpS, this.magS, this.smoothStart, this.smoothEnd);
      } else {
        this.magL.set(this.workL);
        this.magR.set(this.workR);
      }
      const fall = 12 * dt;
      peakHold(this.magL, this.holdL, fall);
      peakHold(this.magR, this.holdR, fall);
      peakHold(this.magM, this.holdM, fall);
      maxHold(this.magL, this.maxL);
      maxHold(this.magR, this.maxR);
    }
    this.onFrame?.(this.frame());
  }

  private updateMeters(dt: number) {
    const l = this.timeL;
    const r = this.timeR;
    const n = l.length;
    const peakDecay = Math.pow(10, -1 / (1.7 * (1 / dt)));
    const tpDecay = Math.pow(10, -1 / (1.2 * (1 / dt)));
    const rmsAlpha = 1 - Math.exp(-dt / 0.3);
    const momAlpha = 1 - Math.exp(-dt / 0.4);
    const shortAlpha = 1 - Math.exp(-dt / 3);
    const intAlpha = 1 - Math.exp(-dt / 12);
    const corrAlpha = 1 - Math.exp(-dt / 0.08);
    let peakL = 0, peakR = 0, accL = 0, accR = 0, num = 0;
    let prevL = l[0] ?? 0, prevR = r[0] ?? 0, tpL = 0, tpR = 0, ms = 0;
    const step = Math.max(1, Math.floor(n / 256));
    for (let i = 0; i < n; i++) {
      const a = l[i] ?? 0;
      const b = r[i] ?? 0;
      const aa = Math.abs(a);
      const bb = Math.abs(b);
      if (aa > peakL) peakL = aa;
      if (bb > peakR) peakR = bb;
      accL += a * a;
      accR += b * b;
      num += a * b;
      if (aa >= 0.999 || bb >= 0.999) this.clipCount += 1;
      tpL = Math.max(tpL, aa, Math.abs(prevL + (a - prevL) * 0.25), Math.abs(prevL + (a - prevL) * 0.5), Math.abs(prevL + (a - prevL) * 0.75));
      tpR = Math.max(tpR, bb, Math.abs(prevR + (b - prevR) * 0.25), Math.abs(prevR + (b - prevR) * 0.5), Math.abs(prevR + (b - prevR) * 0.75));
      prevL = a;
      prevR = b;
      const kL = runBiquad(this.kL.hp, runBiquad(this.kL.shelf, a));
      const kR = runBiquad(this.kR.hp, runBiquad(this.kR.shelf, b));
      ms += 0.5 * (kL * kL + kR * kR);
      if (i % step === 0) {
        const w = this.xyWrite;
        this.xy[w] = a;
        this.xy[w + 1] = b;
        this.xyWrite = (w + 2) % this.xy.length;
      }
    }
    this.peakL = Math.max(peakL, this.peakL * peakDecay);
    this.peakR = Math.max(peakR, this.peakR * peakDecay);
    this.truePeakL = Math.max(tpL, this.truePeakL * tpDecay);
    this.truePeakR = Math.max(tpR, this.truePeakR * tpDecay);
    this.rms2L += (accL / n - this.rms2L) * rmsAlpha;
    this.rms2R += (accR / n - this.rms2R) * rmsAlpha;
    this.corrNum += (num / n - this.corrNum) * corrAlpha;
    this.corrDenL += (accL / n - this.corrDenL) * corrAlpha;
    this.corrDenR += (accR / n - this.corrDenR) * corrAlpha;
    const meanSq = ms / n + 1e-12;
    this.msM += (meanSq - this.msM) * momAlpha;
    this.msS += (meanSq - this.msS) * shortAlpha;
    this.msI += (meanSq - this.msI) * intAlpha;
  }

  private frame(): AnalyzerFrame {
    const den = Math.sqrt(Math.max(this.corrDenL, 1e-12) * Math.max(this.corrDenR, 1e-12));
    const corr = Math.max(-1, Math.min(1, this.corrNum / den));
    const rmsL = Math.sqrt(this.rms2L);
    const rmsR = Math.sqrt(this.rms2R);
    const lufs = (ms: number) => -0.691 + 10 * Math.log10(ms + 1e-12);
    return {
      sampleRate: this.ctx?.sampleRate ?? 48000,
      fftSize: this.settings.fftSize,
      binCount: this.magL.length,
      magL: this.magL, magR: this.magR, magM: this.magM, magS: this.magS,
      holdL: this.holdL, holdR: this.holdR, holdM: this.holdM, maxL: this.maxL, maxR: this.maxR,
      peakL: dbFromAmp(this.peakL), peakR: dbFromAmp(this.peakR),
      rmsL: dbFromAmp(rmsL), rmsR: dbFromAmp(rmsR),
      truePeakL: dbFromAmp(this.truePeakL), truePeakR: dbFromAmp(this.truePeakR),
      lufsM: lufs(this.msM), lufsS: lufs(this.msS), lufsI: lufs(this.msI),
      correlation: corr, clipCount: this.clipCount,
      crestL: dbFromAmp(this.peakL) - dbFromAmp(rmsL),
      crestR: dbFromAmp(this.peakR) - dbFromAmp(rmsR),
      xy: this.xy, xyLen: this.xy.length,
      running: this.ctx?.state === "running" && this.source !== "idle",
      source: this.source,
    };
  }
}
