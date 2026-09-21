function pinkFrame(state: { b0: number; b1: number; b2: number; b3: number; b4: number; b5: number; b6: number }) {
  const white = Math.random() * 2 - 1;
  state.b0 = 0.99886 * state.b0 + white * 0.0555179;
  state.b1 = 0.99332 * state.b1 + white * 0.0750759;
  state.b2 = 0.969 * state.b2 + white * 0.153852;
  state.b3 = 0.8665 * state.b3 + white * 0.3104856;
  state.b4 = 0.55 * state.b4 + white * 0.5329522;
  state.b5 = -0.7616 * state.b5 - white * 0.016898;
  const pink = state.b0 + state.b1 + state.b2 + state.b3 + state.b4 + state.b5 + state.b6 + white * 0.5362;
  state.b6 = white * 0.115926;
  return pink * 0.11;
}

export function createDemoBuffer(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const bpm = 100;
  const beats = 16;
  const seconds = (beats * 60) / bpm;
  const n = Math.floor(sr * seconds);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const pink = { b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0 };
  const beat = 60 / bpm;
  const notes = [55, 55, 41.2, 46.25, 55, 55, 61.74, 46.25];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const barPos = (t / beat) % 16;
    let sample = pinkFrame(pink) * 0.045;
    const kickBeat = Math.floor(t / beat);
    const kickT = t - kickBeat * beat;
    if (kickBeat % 2 === 0 && kickT < 0.18) {
      const env = Math.exp(-kickT * 22);
      const freq = 118 * (40 / 118) ** (kickT / 0.09);
      const phase = 2 * Math.PI * 80 * kickT + (118 - freq) * kickT * 4;
      const click = Math.exp(-kickT * 90) * (Math.random() * 2 - 1) * 0.22;
      sample += Math.sin(phase) * env * 0.95 + click;
    }
    const note = notes[Math.floor(barPos / 2) % notes.length] ?? 55;
    const bassEnv = 0.55 + 0.45 * Math.sin(Math.PI * 2 * (barPos % 2) * 0.5);
    const saw =
      Math.sin(2 * Math.PI * note * t) * 0.55 +
      Math.sin(2 * Math.PI * note * 2 * t) * 0.22 +
      Math.sin(2 * Math.PI * note * 3 * t) * 0.1;
    sample += saw * bassEnv * 0.28;
    const padA = 220 * (1 + 0.003 * Math.sin(t * 0.7));
    const padE = 329.63 * (1 + 0.002 * Math.sin(t * 0.53 + 1));
    const padC = 261.63 * (1 + 0.0025 * Math.sin(t * 0.41 + 2));
    const pad =
      Math.sin(2 * Math.PI * padA * t) * 0.12 +
      Math.sin(2 * Math.PI * padC * t) * 0.1 +
      Math.sin(2 * Math.PI * padE * t) * 0.09;
    sample += pad * (0.7 + 0.3 * Math.sin(t * 0.25));
    const eighth = Math.floor(t / (beat / 2));
    const hatT = t - eighth * (beat / 2);
    if (eighth % 2 === 1 && hatT < 0.04) {
      sample += (Math.random() * 2 - 1) * Math.exp(-hatT * 70) * 0.16;
    }
    const width = 0.18 * Math.sin(t * 0.9);
    L[i] = sample * (1 - width);
    R[i] = sample * (1 + width);
  }
  let peak = 1e-6;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.58 / peak;
  for (let i = 0; i < n; i++) {
    L[i] *= g;
    R[i] *= g;
  }
  const buffer = ctx.createBuffer(2, n, sr);
  buffer.copyToChannel(L, 0);
  buffer.copyToChannel(R, 1);
  return buffer;
}

export function connectFileBuffer(ctx: AudioContext, buffer: AudioBuffer, dest: AudioNode): { stop: () => void } {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(dest);
  src.start();
  return {
    stop() {
      try { src.stop(); } catch { /* already stopped */ }
      src.disconnect();
    },
  };
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const ch = Math.min(2, buffer.numberOfChannels);
  const sr = buffer.sampleRate;
  const n = buffer.length;
  const L = buffer.getChannelData(0);
  const R = ch > 1 ? buffer.getChannelData(1) : L;
  const bytes = n * ch * 2;
  const out = new ArrayBuffer(44 + bytes);
  const view = new DataView(out);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * ch * 2, true);
  view.setUint16(32, ch * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, bytes, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    const a = Math.max(-1, Math.min(1, L[i] ?? 0));
    const b = Math.max(-1, Math.min(1, R[i] ?? 0));
    view.setInt16(o, a < 0 ? a * 0x8000 : a * 0x7fff, true);
    o += 2;
    if (ch > 1) {
      view.setInt16(o, b < 0 ? b * 0x8000 : b * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([out], { type: "audio/wav" });
}
