import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine, type AnalyzerFrame, type AnalyzerSnapshot, type SourceKind } from "@/lib/audio/engine";
import { useAnalyzerStore } from "@/lib/analyzer-store";
import { SNAP_COLORS } from "@/lib/tints";
import { usePhoneLandscape } from "@/lib/use-phone-landscape";
import { usePwaInstall } from "@/lib/use-pwa-install";
import { Button } from "@/components/ui/button";
import { DonateBanner } from "@/components/analyzer/DonateBanner";
import { InstallSheet } from "@/components/analyzer/InstallSheet";
import { LandscapeHud } from "@/components/analyzer/LandscapeHud";
import { MeterColumn, type MeterColumnHandle } from "@/components/analyzer/MeterColumn";
import { SettingsPanel } from "@/components/analyzer/SettingsPanel";
import { SpectrumCanvas, type SpectrumCanvasHandle } from "@/components/analyzer/SpectrumCanvas";
import { StatsBar, type StatsBarHandle } from "@/components/analyzer/StatsBar";
import { Toolbar } from "@/components/analyzer/Toolbar";
import { cn } from "@/lib/utils";

export function AnalyzerApp() {
  const engineRef = useRef<AudioEngine | null>(null);
  const spectrumRef = useRef<SpectrumCanvasHandle>(null);
  const metersRef = useRef<MeterColumnHandle>(null);
  const statsRef = useRef<StatsBarHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFrame = useRef<AnalyzerFrame | null>(null);
  const landscape = usePhoneLandscape();
  const pwa = usePwaInstall();

  const [source, setSource] = useState<SourceKind>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [needsGesture, setNeedsGesture] = useState(true);
  const [snapshots, setSnapshots] = useState<AnalyzerSnapshot[]>([]);
  const [dragOver, setDragOver] = useState(false);

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
    void engine.startDemo().then(() => {
      setNeedsGesture(engine.isRunning() ? false : true);
      setSource("demo");
    });
    return () => engine.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const unlock = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.resume();
    if (engine.getSource() === "idle") await engine.startDemo();
    setNeedsGesture(!engine.isRunning());
    setSource(engine.getSource());
  }, []);

  const onDemo = useCallback(async () => {
    setMicError(null);
    await engineRef.current?.startDemo();
    setNeedsGesture(false);
    setSource("demo");
    setFileName(null);
  }, []);

  const onMic = useCallback(async () => {
    setMicError(null);
    try {
      await engineRef.current?.startMic();
      setNeedsGesture(false);
      setSource("mic");
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
      await engineRef.current?.startFile(file);
      setNeedsGesture(false);
      setSource("file");
      setFileName(file.name);
    } catch {
      setMicError("No se pudo decodificar el archivo");
    }
  }, []);

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
        useAnalyzerStore.getState().toggleFrozen();
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
    const blockGesture = (ev: Event) => ev.preventDefault();
    document.addEventListener("gesturestart", blockGesture);
    document.addEventListener("gesturechange", blockGesture);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
    };
  }, [onDemo, onMic, onReset, onSnapshot]);

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
          {needsGesture && (
            <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-1.5">
              <div className="flex w-full max-w-lg items-center gap-1.5 rounded-sm bg-surface/95 px-2 py-1 shadow-[var(--shadow-panel)] backdrop-blur-sm">
                <p className="mr-auto min-w-0 truncate font-display text-xs font-bold tracking-[0.12em] text-fg uppercase italic">Audio</p>
                <Button variant="primary" size="sm" className="h-7 min-h-7 px-2.5" onClick={() => void unlock()}>Demo</Button>
                <Button variant="outline" size="sm" className="h-7 min-h-7 px-2.5" onClick={() => void onMic()}>Mic</Button>
                <Button variant="ghost" size="icon-sm" className="size-7 min-h-7 min-w-7" aria-label="Ocultar reproductor" onClick={() => setNeedsGesture(false)}><span className="text-sm leading-none">×</span></Button>
              </div>
            </div>
          )}
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
