import {
  Camera, Download, FileAudio, Gauge, Mic, Pause, RotateCcw, Settings2, Snowflake, Volume2, ZoomIn, ZoomOut,
} from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import type { SourceKind } from "@/lib/audio/engine";
import { useAnalyzerStore } from "@/lib/analyzer-store";
import { BrandMark } from "@/components/analyzer/BrandMark";
import { OfflineBadge } from "@/components/analyzer/OfflineBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  source: SourceKind;
  fileName: string | null;
  running: boolean;
  micError: string | null;
  fileRef: RefObject<HTMLInputElement | null>;
  onDemo: () => void;
  onMic: () => void;
  onFile: (file: File) => void;
  onReset: () => void;
  onSnapshot: () => void;
  onExport: () => void;
  onInstall?: () => void;
  showInstall?: boolean;
  online?: boolean;
};

export function Toolbar({
  source, fileName, running, micError, fileRef, onDemo, onMic, onFile, onReset, onSnapshot, onExport, onInstall, showInstall = false, online = true,
}: Props) {
  const frozen = useAnalyzerStore((s) => s.frozen);
  const wide = useAnalyzerStore((s) => s.wide);
  const settingsOpen = useAnalyzerStore((s) => s.settingsOpen);
  const toggleFrozen = useAnalyzerStore((s) => s.toggleFrozen);
  const toggleWide = useAnalyzerStore((s) => s.toggleWide);
  const toggleSettings = useAnalyzerStore((s) => s.toggleSettings);
  const zoomIn = useAnalyzerStore((s) => s.zoomIn);
  const zoomOut = useAnalyzerStore((s) => s.zoomOut);
  const zoomToSelection = useAnalyzerStore((s) => s.zoomToSelection);
  const selectedHz = useAnalyzerStore((s) => s.selectedHz);
  const bandMin = useAnalyzerStore((s) => s.bandMin);
  const fftSize = useAnalyzerStore((s) => s.fftSize);
  const slope = useAnalyzerStore((s) => s.slope);
  const channel = useAnalyzerStore((s) => s.channel);
  const setFftSize = useAnalyzerStore((s) => s.setFftSize);
  const setSlope = useAnalyzerStore((s) => s.setSlope);
  const setChannel = useAnalyzerStore((s) => s.setChannel);
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };
  return (
    <header className="flex flex-col gap-2 border-b border-fg/10 bg-surface px-3 py-2.5 md:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <BrandMark className="mr-2" />
        <OfflineBadge online={online} />
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="primary" onClick={onMic} aria-pressed={source === "mic"}>
            <Mic className="size-3.5" strokeWidth={1.75} />
            <span className="sm:hidden">Mic</span>
            <span className="hidden sm:inline">Micrófono</span>
          </Button>
          <Button variant="toggle" pressed={source === "demo"} onClick={onDemo}>
            <Volume2 className="size-3.5" strokeWidth={1.75} /> Demo
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileAudio className="size-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Archivo</span>
          </Button>
          <input ref={fileRef} type="file" accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aiff" className="hidden" hidden tabIndex={-1} aria-hidden="true" onChange={onPick} />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button variant="toggle" pressed={frozen} onClick={toggleFrozen} aria-pressed={frozen} aria-label="Hold">
            {frozen ? <Pause className="size-3.5" strokeWidth={1.75} /> : <Snowflake className="size-3.5" strokeWidth={1.75} />}
            <span className="hidden sm:inline">Hold</span>
          </Button>
          <Button variant="outline" size="icon-sm" onClick={zoomOut} aria-label="Alejar"><ZoomOut className="size-3.5" strokeWidth={1.75} /></Button>
          <Button variant="outline" size="icon-sm" onClick={zoomIn} aria-label="Acercar"><ZoomIn className="size-3.5" strokeWidth={1.75} /></Button>
          {(bandMin != null || selectedHz != null) && <Button variant="primary" onClick={zoomToSelection}>Zoom</Button>}
          <Button variant="toggle" pressed={!wide} onClick={toggleWide} aria-pressed={!wide} aria-label="Medidores">
            <Gauge className="size-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Medidores</span>
          </Button>
          <Button variant="outline" onClick={onSnapshot} aria-label="Captura"><Camera className="size-3.5" strokeWidth={1.75} /><span className="hidden sm:inline">Captura</span></Button>
          <Button variant="outline" onClick={onExport}>PNG</Button>
          {showInstall && onInstall ? (
            <Button variant="primary" onClick={onInstall} aria-label="Instalar"><Download className="size-3.5" strokeWidth={1.75} /><span className="hidden sm:inline">Instalar</span></Button>
          ) : null}
          <Button variant="ghost" size="icon-sm" onClick={onReset} aria-label="Reiniciar máximos"><RotateCcw className="size-3.5" strokeWidth={1.75} /></Button>
          <Button variant="toggle" pressed={settingsOpen} size="icon-sm" onClick={toggleSettings} aria-label="Ajustes"><Settings2 className="size-3.5" strokeWidth={1.75} /></Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-micro">
        <Select label="FFT" value={String(fftSize)} onChange={(v) => setFftSize(Number(v) as typeof fftSize)} options={[{ value: "2048", label: "2 048" }, { value: "4096", label: "4 096" }, { value: "8192", label: "8 192" }, { value: "16384", label: "16 384" }]} />
        <Select label="Pendiente" value={String(slope)} onChange={(v) => setSlope(Number(v) as typeof slope)} options={[{ value: "0", label: "0 dB/oct" }, { value: "1.5", label: "1.5" }, { value: "3", label: "3.0" }, { value: "4.5", label: "4.5" }, { value: "6", label: "6.0" }]} />
        <Select label="Canal" value={channel} onChange={(v) => setChannel(v as typeof channel)} options={[{ value: "overlay", label: "L / R" }, { value: "sum", label: "Suma" }, { value: "left", label: "L" }, { value: "right", label: "R" }, { value: "mid", label: "Mid" }, { value: "side", label: "Side" }]} />
        <p className="ml-auto truncate text-subtle">
          {source === "mic" && "Entrada: micrófono"}
          {source === "demo" && "Entrada: señal de demostración"}
          {source === "file" && `Entrada: ${fileName ?? "archivo"}`}
          {source === "idle" && (running ? "En espera" : "Pulsa Demo o Micrófono")}
          {micError ? ` · ${micError}` : ""}
        </p>
      </div>
    </header>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex h-8 items-center gap-1.5 rounded-sm bg-inset px-2 text-muted">
      <span className="text-2xs tracking-wide uppercase">{label}</span>
      <select className={cn("h-8 bg-transparent font-mono text-micro text-fg outline-none")} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-fg">{o.label}</option>
        ))}
      </select>
    </label>
  );
}
