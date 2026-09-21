import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PlaylistItem = {
  id: string;
  label: string;
  kind: "demo" | "file";
};

type Props = {
  source: "idle" | "demo" | "mic" | "file";
  running: boolean;
  fileName: string | null;
  muted: boolean;
  volume: number;
  playlist: PlaylistItem[];
  activeId: string;
  onDemo: () => void;
  onMic: () => void;
  onFile: (file: File) => void;
  onPlayItem: (item: PlaylistItem) => void;
  onPlay: () => void;
  onStop: () => void;
  onMute: () => void;
  onVolume: (value: number) => void;
};

export function AudioDock({
  source,
  running,
  fileName,
  muted,
  volume,
  playlist,
  activeId,
  onDemo,
  onMic,
  onFile,
  onPlayItem,
  onPlay,
  onStop,
  onMute,
  onVolume,
}: Props) {
  const [open, setOpen] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const label =
    source === "mic" ? "Mic" : source === "file" ? fileName ?? "Archivo" : source === "demo" ? "Demo" : "Audio";

  if (!open) {
    return (
      <button
        type="button"
        className="absolute bottom-2 right-2 z-30 flex h-8 items-center gap-1.5 rounded-full bg-bg/45 px-2.5 text-[10px] font-semibold tracking-[0.14em] text-fg/90 uppercase backdrop-blur-md"
        onClick={() => setOpen(true)}
        aria-label="Mostrar reproductor"
      >
        <span className={cn("size-1.5 rounded-full", running ? "bg-accent" : "bg-muted")} />
        Audio
      </button>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-1.5">
      <div className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-md bg-bg/42 shadow-[0_8px_28px_rgb(0_0_0_/_0.28)] backdrop-blur-md">
        <div className="flex items-center gap-1 px-1.5 py-1">
          <span className={cn("ml-1 size-1.5 shrink-0 rounded-full", running ? "bg-accent" : "bg-muted")} />
          <p className="min-w-0 flex-1 truncate font-display text-[10px] font-bold tracking-[0.14em] text-fg/90 uppercase italic">
            {label}
          </p>
          <Button variant="primary" size="sm" className="h-6 min-h-6 px-2 text-[10px]" onClick={onPlay} disabled={running && source !== "idle"}>
            Play
          </Button>
          <Button variant="outline" size="sm" className="h-6 min-h-6 px-2 text-[10px]" onClick={onStop} disabled={!running && source === "idle"}>
            Stop
          </Button>
          <Button variant="ghost" size="sm" className="h-6 min-h-6 px-2 text-[10px]" onClick={onDemo}>
            Demo
          </Button>
          <Button variant="ghost" size="sm" className="h-6 min-h-6 px-2 text-[10px]" onClick={onMic}>
            Mic
          </Button>
          <Button variant="ghost" size="sm" className="h-6 min-h-6 px-2 text-[10px]" onClick={() => fileRef.current?.click()}>
            Archivo
          </Button>
          <Button variant="ghost" size="sm" className="h-6 min-h-6 px-2 text-[10px]" onClick={() => setListOpen((v) => !v)}>
            Lista
          </Button>
          <Button variant="ghost" size="sm" className="h-6 min-h-6 px-1.5 text-[10px]" onClick={onMute} aria-label="Silenciar">
            {muted ? "Off" : "Vol"}
          </Button>
          <Button variant="ghost" size="icon-sm" className="size-6 min-h-6 min-w-6" aria-label="Ocultar reproductor" onClick={() => setOpen(false)}>
            <span className="text-xs leading-none">×</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 px-2 pb-1.5">
          <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => onVolume(Number(e.target.value))} className="h-1 w-full accent-current" aria-label="Volumen" />
        </div>
        {listOpen && (
          <ul className="max-h-28 space-y-0.5 overflow-auto border-t border-fg/10 px-1.5 py-1">
            {playlist.map((item) => (
              <li key={item.id}>
                <button type="button" className={cn("flex w-full items-center rounded px-1.5 py-1 text-left text-[11px]", item.id === activeId ? "bg-fg/12 text-fg" : "text-muted")} onClick={() => onPlayItem(item)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <input ref={fileRef} type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }} />
      </div>
    </div>
  );
}
