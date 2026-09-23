import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PlaylistItem = {
  id: string;
  label: string;
  kind: "demo" | "file";
};

type Props = {
  source: "idle" | "demo" | "mic" | "file";
  running: boolean;
  paused: boolean;
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
  onPause: () => void;
  onStop: () => void;
  onRewind: () => void;
  onMute: () => void;
  onVolume: (value: number) => void;
};

function Key({
  label,
  active,
  disabled,
  wide,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  wide?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 items-center justify-center rounded-[3px] border text-fg/85",
        "border-white/12 bg-gradient-to-b from-white/12 to-black/25",
        "shadow-[inset_0_1px_0_rgb(255_255_255_/_0.18),0_1px_1px_rgb(0_0_0_/_0.35)]",
        "disabled:opacity-35",
        wide ? "w-8" : "w-7",
        active && "border-accent/50 from-accent/30 to-black/20 text-accent",
      )}
    >
      {children}
    </button>
  );
}

const Ico = {
  rewind: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M2 8 8 3.5v9L2 8Zm6 0 6-4.5v9L8 8Z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M4 2.8 13.2 8 4 13.2V2.8Z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M3.2 2.5h3.2v11H3.2zm6.4 0h3.2v11H9.6z" />
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M3.4 3.4h9.2v9.2H3.4z" />
    </svg>
  ),
  demo: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M2 10h1.4v2H2zm2.4-3h1.4v5H4.4zM6.8 4h1.4v8H6.8zm2.4 2h1.4v6H9.2zm2.4-3H14v9h-1.4z" />
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M8 1.6A2.2 2.2 0 0 0 5.8 3.8v3.6a2.2 2.2 0 1 0 4.4 0V3.8A2.2 2.2 0 0 0 8 1.6ZM4.4 7.2v.2a3.6 3.6 0 0 0 7.2 0v-.2h1.2v.2a4.8 4.8 0 0 1-4.2 4.76V14h2.2v1.2H5.2V14h2.2v-1.84A4.8 4.8 0 0 1 3.2 7.4v-.2Z" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M3.2 2.2h6.1L12.8 5.7v8.1H3.2Zm6.2.9v2.8h2.8Z" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M2.4 3.2h11.2v1.4H2.4zm0 4.1h11.2v1.4H2.4zm0 4.1h11.2v1.4H2.4z" />
    </svg>
  ),
  vol: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M2.2 6.1h2.2L7.4 3.6v8.8L4.4 9.9H2.2zm7.1.2a2.6 2.6 0 0 1 0 3.4l-.9-.9a1.4 1.4 0 0 0 0-1.6zm1.8-1.7a5 5 0 0 1 0 6.8l-.9-.9a3.7 3.7 0 0 0 0-5z" />
    </svg>
  ),
  mute: (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      <path d="M2.2 6.1h2.2L7.4 3.6v8.8L4.4 9.9H2.2zm10.2-2.3.9.9-1.7 1.7 1.7 1.7-.9.9-1.7-1.7-1.7 1.7-.9-.9 1.7-1.7-1.7-1.7.9-.9 1.7 1.7z" />
    </svg>
  ),
};

export function AudioDock({
  source,
  running,
  paused,
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
  onPause,
  onStop,
  onRewind,
  onMute,
  onVolume,
}: Props) {
  const [open, setOpen] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const label =
    source === "mic" ? "Mic" : source === "file" ? fileName ?? "Archivo" : source === "demo" ? "Demo" : "Audio";
  const armed = source !== "idle" || paused;

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
      <div className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-md border border-white/8 bg-bg/55 shadow-[0_8px_28px_rgb(0_0_0_/_0.28)] backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-1.5 py-1">
          <span className={cn("ml-0.5 size-1.5 shrink-0 rounded-full", running ? "bg-accent" : paused ? "bg-amber-400" : "bg-muted")} />
          <p className="min-w-0 flex-1 truncate font-display text-[10px] font-bold tracking-[0.16em] text-fg/80 uppercase italic">
            {paused ? "Pausa" : label}
          </p>
          <div className="flex items-center gap-0.5 rounded-sm bg-black/25 p-0.5">
            <Key label="Rewind" disabled={!armed && source === "idle"} onClick={onRewind}>
              {Ico.rewind}
            </Key>
            <Key label="Play" active={running} disabled={running} onClick={onPlay}>
              {Ico.play}
            </Key>
            <Key label="Pausa" active={paused} disabled={!running} onClick={onPause}>
              {Ico.pause}
            </Key>
            <Key label="Stop" disabled={!armed} onClick={onStop}>
              {Ico.stop}
            </Key>
          </div>
          <div className="flex items-center gap-0.5">
            <Key label="Demo" active={source === "demo"} onClick={onDemo}>
              {Ico.demo}
            </Key>
            <Key label="Micrófono" active={source === "mic"} onClick={onMic}>
              {Ico.mic}
            </Key>
            <Key label="Archivo" active={source === "file"} onClick={() => fileRef.current?.click()}>
              {Ico.file}
            </Key>
            <Key label="Lista" active={listOpen} onClick={() => setListOpen((v) => !v)}>
              {Ico.list}
            </Key>
            <Key label={muted ? "Activar sonido" : "Silenciar"} active={muted} onClick={onMute}>
              {muted ? Ico.mute : Ico.vol}
            </Key>
            <Key label="Ocultar reproductor" onClick={() => setOpen(false)}>
              <span className="text-[11px] leading-none">×</span>
            </Key>
          </div>
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
