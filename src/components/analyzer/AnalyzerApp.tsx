import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine, type AnalyzerFrame, type AnalyzerSnapshot, type SourceKind } from "@/lib/audio/engine";
import { useAnalyzerStore } from "@/lib/analyzer-store";
import { SNAP_COLORS } from "@/lib/tints";
import { usePhoneLandscape } from "@/lib/use-phone-landscape";
import { usePwaInstall } from "@/lib/use-pwa-install";
import { AudioDock, type PlaylistItem } from "@/components/analyzer/AudioDock";
import { DonateBanner } from "@/components/analyzer/DonateBanner";
import { InstallSheet } from "@/components/analyzer/InstallSheet";
import { LandscapeHud } from "@/components/analyzer/LandscapeHud";
import { MeterColumn, type MeterColumnHandle } from "@/components/analyzer/MeterColumn";
import { SettingsPanel } from "@/components/analyzer/SettingsPanel";
import { SpectrumCanvas, type SpectrumCanvasHandle } from "@/components/analyzer/SpectrumCanvas";
import { StatsBar, type StatsBarHandle } from "@/components/analyzer/StatsBar";
import { Toolbar } from "@/components/analyzer/Toolbar";
import { cn } from "@/lib/utils";

const DEMO_ITEM: PlaylistItem = { id: "demo", label: "Demo Martucci", kind: "demo" };

export function AnalyzerApp() {
  const engineRef = useRef<AudioEngine | null>(null);
  const spectrumRef = useRef<SpectrumCanvasHandle>(null);
  const metersRef = useRef<MeterColumnHandle>(null);
  const statsRef = useRef<StatsBarHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFrame = useRef<AnalyzerFrame | null>(null);
  const filesRef = useRef<Map<string, File>>(new Map());
  const lastPlayRef = useRef<PlaylistItem>(DEMO_ITEM);
  const landscape = usePhoneLandscape();
  const pwa = usePwaInstall();

  const [source, setSource] = useState<SourceKind>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<AnalyzerSnapshot[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([DEMO_ITEM]);
  const [activeId, setActiveId] = useState("demo");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.78);

  const fftSize = useAnalyzerStore((s) => s.fftSize);
  const windowName = useAnalyzerStore((s) => s.windowName);
  const slope = useAnalyzerStore((s) => s.slope);
  const smoothing = useAnalyzerStore((s) => s.smoothing);
  const secondary = useAnalyzerStore((s) => s.secondary);
  const dbMin = useAnalyzerStore((s) => s.dbMin);
  const channel = useAnalyzerStore((s) => s.channel);
  const tint = useAnalyzerStore((s) => s.tint);
  const wide = useAnalyzerStore((s) => s.wide);
  const frozen = useAnalyzerStore((s) => s.frozen);
  const zoomMin = useAnalyzerStore((s) => s.zoomMin);
  const zoomMax = useAnalyzerStore((s) => s.zoomMax);
  const selectedHz = useAnalyzerStore((s) => s.selectedHz);
  const bandMin = useAnalyzerStore((s) => s.bandMin);
  const bandMax = useAnalyzerStore((s) => s.bandMax);
  const setZoom = useAnalyzerStore((s) => s.setZoom);
  const setSelectedHz = useAnalyzerStore((s) => s.setSelectedHz);
  const setBand = useAnalyzerStore((s) => s.setBand);
  const hideChrome = landscape || wide;

  useEffect(() => {
    const engine = new AudioEngine({ fftSize, windowName, slope, smoothing, secondary });
    engineRef.current = engine;
    let lastSource: SourceKind = engine.getSource();
    let lastRunning = engine.isRunning();
    engine.onFrame = (frame) => {
      lastFrame.current = frame;
      spectrumRef.current?.draw(frame);
      metersRef.current?.draw(frame);
      statsRef.current?.update(frame);
      if (frame.source !== lastSource) {
        lastSource = frame.source;
        setSource(frame.source);
      }
      if (frame.running !== lastRunning) {
        lastRunning = frame.running;
        setRunning(frame.running);
      }
    };
    return () => engine.dispose();
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  }, []);

  useEffect(() => {
    engineRef.current?.configure({ fftSize, windowName, slope, smoothing, secondary });
  }, [fftSize, windowName, slope, smoothing, secondary]);

  useEffect(() => {
    engineRef.current?.setFrozen(frozen);
  }, [frozen]);

  const onDemo = useCallback(async () => {
    setMicError(null);
    lastPlayRef.current = DEMO_ITEM;
    await engineRef.current?.startDemo();
    engineRef.current?.setOutputGain(volume);
    engineRef.current?.setMuted(muted);
    setSource("demo");
    setRunning(true);
    setPaused(false);
    setActiveId("demo");
    setFileName(null);
  }, [muted, volume]);

  const onMic = useCallback(async () => {
    setMicError(null);
    try {
      await engineRef.current?.startMic();
      setSource("mic");
      setRunning(true);
      setPaused(false);
      setFileName(null);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permiso de micrófono denegado"
          : "No se pudo abrir el micrófono";
      setMicError(message);
    }
  }, []);

  const onFile = useCallback(async (file: File) => {
    setMicError(null);
    try {
      const id = `file-${file.name}-${file.size}`;
      const item: PlaylistItem = { id, label: file.name, kind: "file" };
      filesRef.current.set(id, file);
      lastPlayRef.current = item;
      setPlaylist((prev) => (prev.some((row) => row.id === id) ? prev : [...prev, item]));
      await engineRef.current?.startFile(file);
      engineRef.current?.setOutputGain(volume);
      engineRef.current?.setMuted(muted);
      setSource("file");
      setRunning(true);
      setPaused(false);
      setActiveId(id);
      setFileName(file.name);
    } catch {
      setMicError("No se pudo decodificar el archivo");
    }
  }, [muted, volume]);

  const onPlayItem = useCallback(async (item: PlaylistItem) => {
    lastPlayRef.current = item;
    if (item.kind === "demo") {
      await onDemo();
      return;
    }
    const file = filesRef.current.get(item.id);
    if (file) await onFile(file);
  }, [onDemo, onFile]);

  const onPlay = useCallback(async () => {
    if (paused && source !== "idle" && source !== "mic") {
      await engineRef.current?.resumePlayback();
      setPaused(false);
      setRunning(true);
      return;
    }
    if (source === "mic") {
      await onMic();
      return;
    }
    await onPlayItem(lastPlayRef.current);
  }, [onMic, onPlayItem, paused, source]);

  const onPause = useCallback(() => {
    engineRef.current?.pause();
    setPaused(true);
    setRunning(false);
  }, []);

  const onRewind = useCallback(async () => {
    if (source === "idle" && !paused) {
      await onPlayItem(lastPlayRef.current);
      return;
    }
    await engineRef.current?.rewind();
  }, [onPlayItem, paused, source]);

  const onStop = useCallback(() => {
    engineRef.current?.stop();
    setRunning(false);
    setPaused(false);
    setSource("idle");
  }, []);

  const onVolume = useCallback((value: number) => {
    setVolume(value);
    setMuted(value <= 0);
    engineRef.current?.setOutputGain(value);
    engineRef.current?.setMuted(value <= 0);
  }, []);

  const onMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const unlock = useCallback(async () => {
    await onDemo();
  }, [onDemo]);

  const onReset = useCallback(() => engineRef.current?.resetHolds(), []);
  const onExport = useCallback(() => spectrumRef.current?.exportPng(), []);
  const onSnapshot = useCallback(() => {
    const frame = lastFrame.current;
    const canvas = spectrumRef.current;
    if (!frame || !canvas) return;
    const mag = canvas.capturePrimary(frame);
    setSnapshots((prev) => {
      if (prev.length >= 5) return prev;
      const i = prev.length;
      return [...prev, { id: crypto.randomUUID(), name: `C${i + 1}`, color: SNAP_COLORS[i % SNAP_COLORS.length], gainDb: 0, mag, sampleRate: frame.sampleRate, fftSize: frame.fftSize }];
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (running) onPause();
        else void onPlay();
      } else if (e.key === "m" || e.key === "M") void onMic();
      else if (e.key === "d" || e.key === "D") void onDemo();
      else if (e.key === "w" || e.key === "W") useAnalyzerStore.getState().toggleWide();
      else if (e.key === "s" || e.key === "S") onSnapshot();
      else if (e.key === "r" || e.key === "R") onReset();
      else if (e.key === "+" || e.key === "=") useAnalyzerStore.getState().zoomIn();
      else if (e.key === "-" || e.key === "_") useAnalyzerStore.getState().zoomOut();
      else if (e.key === "0") useAnalyzerStore.getState().resetZoom();
      else if (e.key === "z" || e.key === "Z") useAnalyzerStore.getState().zoomToSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDemo, onMic, onPause, onPlay, onReset, onSnapshot, running]);

  return (
    <div
      className={cn("flex h-dvh min-h-0 flex-col bg-bg text-fg", landscape && "relative")}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) void onFile(file); }}
    >
      {!landscape && (
        <Toolbar source={source} fileName={fileName} running={running} micError={micError} fileRef={fileRef} onDemo={() => void onDemo()} onMic={() => void onMic()} onFile={(f) => void onFile(f)} onReset={onReset} onSnapshot={onSnapshot} onExport={onExport} showInstall={!pwa.installed} onInstall={() => void pwa.install()} online={pwa.online} />
      )}
      {!landscape && (
        <SettingsPanel snapshots={snapshots} onRemoveSnap={(id) => setSnapshots((s) => s.filter((x) => x.id !== id))} onClearSnaps={() => setSnapshots([])} />
      )}
      <div className={cn("flex min-h-0 flex-1", landscape ? "flex-row" : "flex-col md:flex-row")}>
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-inset">
          <SpectrumCanvas ref={spectrumRef} channel={channel} secondary={secondary} dbMin={dbMin} tint={tint} snapshots={snapshots} frozen={frozen} zoomMin={zoomMin} zoomMax={zoomMax} selectedHz={selectedHz} bandMin={bandMin} bandMax={bandMax} onSelectHz={setSelectedHz} onBand={setBand} onZoom={setZoom} />
          {landscape && <LandscapeHud onUnlock={() => void unlock()} online={pwa.online} />}
          <AudioDock source={source} running={running} paused={paused} fileName={fileName} muted={muted} volume={volume} playlist={playlist} activeId={activeId} onDemo={() => void onDemo()} onMic={() => void onMic()} onFile={(f) => void onFile(f)} onPlayItem={(item) => void onPlayItem(item)} onPlay={() => void onPlay()} onPause={onPause} onStop={onStop} onRewind={() => void onRewind()} onMute={onMute} onVolume={onVolume} />
          {dragOver && <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/70 text-sm text-fg">Suelta el audio para analizarlo</div>}
        </div>
        <MeterColumn ref={metersRef} wide={hideChrome} />
      </div>
      <StatsBar ref={statsRef} wide={hideChrome} />
      <InstallSheet open={pwa.open} platform={pwa.platform} canPrompt={pwa.canPrompt} onClose={() => pwa.setOpen(false)} onPrompt={() => void pwa.install()} />
      <DonateBanner />
    </div>
  );
}
