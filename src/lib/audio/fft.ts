/** In-place radix-2 Cooley–Tukey FFT with reusable scratch. */

export class RealFFT {
  readonly size: number;
  readonly real: Float32Array;
  readonly imag: Float32Array;
  private readonly rev: Uint32Array;
  private readonly wr: Float32Array;
  private readonly wi: Float32Array;

  constructor(size: number) {
    if (size < 32 || (size & (size - 1)) !== 0) {
      throw new Error("FFT size must be a power of two");
    }
    this.size = size;
    this.real = new Float32Array(size);
    this.imag = new Float32Array(size);
    this.rev = new Uint32Array(size);
    this.wr = new Float32Array(size / 2);
    this.wi = new Float32Array(size / 2);
    const bits = Math.log2(size);
    for (let i = 0; i < size; i++) {
      let x = i;
      let y = 0;
      for (let b = 0; b < bits; b++) {
        y = (y << 1) | (x & 1);
        x >>= 1;
      }
      this.rev[i] = y;
    }
    for (let k = 0; k < size / 2; k++) {
      const angle = (-2 * Math.PI * k) / size;
      this.wr[k] = Math.cos(angle);
      this.wi[k] = Math.sin(angle);
    }
  }

  forward(input: Float32Array) {
    const n = this.size;
    const { real, imag, rev, wr, wi } = this;
    for (let i = 0; i < n; i++) {
      real[i] = input[rev[i]] ?? 0;
      imag[i] = 0;
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const tableStep = n / size;
      for (let i = 0; i < n; i += size) {
        let k = 0;
        for (let j = 0; j < half; j++) {
          const i1 = i + j;
          const i2 = i1 + half;
          const r2 = real[i2];
          const m2 = imag[i2];
          const tRe = wr[k] * r2 - wi[k] * m2;
          const tIm = wr[k] * m2 + wi[k] * r2;
          real[i2] = real[i1] - tRe;
          imag[i2] = imag[i1] - tIm;
          real[i1] += tRe;
          imag[i1] += tIm;
          k += tableStep;
        }
      }
    }
  }
}

export type WindowName = "hann" | "hamming" | "blackman" | "rect";

export function makeWindow(size: number, name: WindowName): { window: Float32Array; sum: number } {
  const window = new Float32Array(size);
  let sum = 0;
  const nm1 = size - 1;
  for (let i = 0; i < size; i++) {
    const p = (2 * Math.PI * i) / nm1;
    let w = 1;
    if (name === "hann") w = 0.5 * (1 - Math.cos(p));
    else if (name === "hamming") w = 0.54 - 0.46 * Math.cos(p);
    else if (name === "blackman") w = 0.42 - 0.5 * Math.cos(p) + 0.08 * Math.cos(2 * p);
    window[i] = w;
    sum += w;
  }
  return { window, sum };
}

export function applyWindow(out: Float32Array, input: Float32Array, window: Float32Array) {
  const n = out.length;
  for (let i = 0; i < n; i++) out[i] = (input[i] ?? 0) * window[i];
}

export function magnitudesDb(fft: RealFFT, out: Float32Array, scale: number) {
  const n2 = fft.size / 2;
  const { real, imag } = fft;
  for (let i = 0; i < n2; i++) {
    const mag = Math.hypot(real[i], imag[i]) * scale;
    out[i] = 20 * Math.log10(mag + 1e-12);
  }
}

export function midSideDb(fftL: RealFFT, fftR: RealFFT, mid: Float32Array, side: Float32Array, scale: number) {
  const n2 = fftL.size / 2;
  for (let i = 0; i < n2; i++) {
    const mRe = 0.5 * (fftL.real[i] + fftR.real[i]);
    const mIm = 0.5 * (fftL.imag[i] + fftR.imag[i]);
    const sRe = 0.5 * (fftL.real[i] - fftR.real[i]);
    const sIm = 0.5 * (fftL.imag[i] - fftR.imag[i]);
    mid[i] = 20 * Math.log10(Math.hypot(mRe, mIm) * scale + 1e-12);
    side[i] = 20 * Math.log10(Math.hypot(sRe, sIm) * scale + 1e-12);
  }
}

export function applySlope(db: Float32Array, sampleRate: number, fftSize: number, dbPerOct: number) {
  if (dbPerOct === 0) return;
  const n2 = db.length;
  const binHz = sampleRate / fftSize;
  for (let i = 1; i < n2; i++) {
    const f = i * binHz;
    db[i] += dbPerOct * Math.log2(Math.max(f, 20) / 1000);
  }
}

export function makeSmoothSpans(n2: number, sampleRate: number, fftSize: number, fraction: number): { start: Int16Array; end: Int16Array } {
  const start = new Int16Array(n2);
  const end = new Int16Array(n2);
  if (fraction <= 0) {
    for (let i = 0; i < n2; i++) {
      start[i] = i;
      end[i] = i;
    }
    return { start, end };
  }
  const binHz = sampleRate / fftSize;
  const oct = fraction / 2;
  const ratio = 2 ** oct;
  for (let i = 0; i < n2; i++) {
    const f = Math.max(i * binHz, binHz);
    const lo = Math.max(1, Math.floor(f / ratio / binHz));
    const hi = Math.min(n2 - 1, Math.ceil((f * ratio) / binHz));
    start[i] = lo;
    end[i] = Math.max(lo, hi);
  }
  return { start, end };
}

export function octaveSmooth(src: Float32Array, dst: Float32Array, start: Int16Array, end: Int16Array) {
  const n = src.length;
  for (let i = 0; i < n; i++) {
    const a = start[i];
    const b = end[i];
    let sum = 0;
    let count = 0;
    for (let k = a; k <= b; k++) {
      sum += src[k];
      count++;
    }
    dst[i] = sum / Math.max(1, count);
  }
}

export function peakHold(current: Float32Array, hold: Float32Array, fallDb: number) {
  const n = current.length;
  for (let i = 0; i < n; i++) {
    const c = current[i];
    if (c >= hold[i]) hold[i] = c;
    else hold[i] = Math.max(c, hold[i] - fallDb);
  }
}

export function maxHold(current: Float32Array, hold: Float32Array) {
  const n = current.length;
  for (let i = 0; i < n; i++) {
    if (current[i] > hold[i]) hold[i] = current[i];
  }
}

export function fill(arr: Float32Array, value: number) {
  arr.fill(value);
}
