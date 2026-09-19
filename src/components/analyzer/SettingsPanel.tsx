import type { ReactNode } from "react";
import { useAnalyzerStore } from "@/lib/analyzer-store";
import type { AnalyzerSnapshot } from "@/lib/audio/engine";
import { SNAP_COLORS, TINTS } from "@/lib/tints";
import { DONATE_ALIAS, DONATE_URL } from "@/lib/donate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  snapshots: AnalyzerSnapshot[];
  onRemoveSnap: (id: string) => void;
  onClearSnaps: () => void;
};

export function SettingsPanel({ snapshots, onRemoveSnap, onClearSnaps }: Props) {
  const open = useAnalyzerStore((s) => s.settingsOpen);
  const windowName = useAnalyzerStore((s) => s.windowName);
  const smoothing = useAnalyzerStore((s) => s.smoothing);
  const secondary = useAnalyzerStore((s) => s.secondary);
  const dbMin = useAnalyzerStore((s) => s.dbMin);
  const tint = useAnalyzerStore((s) => s.tint);
  const setWindowName = useAnalyzerStore((s) => s.setWindowName);
  const setSmoothing = useAnalyzerStore((s) => s.setSmoothing);
  const setSecondary = useAnalyzerStore((s) => s.setSecondary);
  const setDbMin = useAnalyzerStore((s) => s.setDbMin);
  const setTint = useAnalyzerStore((s) => s.setTint);
  if (!open) return null;
  return (
    <section className="border-b border-fg/10 bg-elevated px-3 py-3 md:px-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Ventana">
          <ChipRow value={windowName} onChange={(v) => setWindowName(v as typeof windowName)} options={[{ value: "hann", label: "Hann" }, { value: "hamming", label: "Hamming" }, { value: "blackman", label: "Blackman" }, { value: "rect", label: "Rect" }]} />
        </Field>
        <Field label="Suavizado">
          <ChipRow value={String(smoothing)} onChange={(v) => setSmoothing(Number(v) as typeof smoothing)} options={[{ value: "0", label: "Off" }, { value: "24", label: "1/24" }, { value: "12", label: "1/12" }, { value: "6", label: "1/6" }, { value: "3", label: "1/3" }]} />
        </Field>
        <Field label="Espectro secundario">
          <ChipRow value={secondary} onChange={(v) => setSecondary(v as typeof secondary)} options={[{ value: "none", label: "Off" }, { value: "peak", label: "Pico" }, { value: "max", label: "Máx." }]} />
        </Field>
        <Field label="Rango">
          <ChipRow value={String(dbMin)} onChange={(v) => setDbMin(Number(v) as typeof dbMin)} options={[{ value: "-60", label: "−60" }, { value: "-90", label: "−90" }, { value: "-120", label: "−120" }]} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Field label="Fósforo">
          <div className="flex gap-1.5">
            {(Object.keys(TINTS) as Array<keyof typeof TINTS>).map((key) => (
              <button key={key} type="button" aria-label={key} onClick={() => setTint(key)} className={cn("size-7 rounded-full transition-[box-shadow,scale] duration-150", tint === key ? "shadow-[0_0_0_2px_var(--color-bg),0_0_0_4px_var(--color-accent)]" : "opacity-70 hover:opacity-100")} style={{ background: TINTS[key].fill }} />
            ))}
          </div>
        </Field>
        {snapshots.length > 0 && (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span className="text-2xs tracking-wide text-subtle uppercase">Capturas</span>
            {snapshots.map((s, i) => (
              <button key={s.id} type="button" onClick={() => onRemoveSnap(s.id)} className="flex h-8 items-center gap-1.5 rounded-sm bg-inset px-2 text-micro text-fg" title="Quitar captura">
                <span className="size-2 rounded-full" style={{ background: SNAP_COLORS[i % SNAP_COLORS.length] }} />
                {s.name}
              </button>
            ))}
            <Button variant="ghost" onClick={onClearSnaps}>Limpiar</Button>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-micro">
        <a className="text-accent hover:underline" href={DONATE_URL} target="_blank" rel="noopener noreferrer" title={`Copiá el alias ${DONATE_ALIAS}`}>Donar ({DONATE_ALIAS})</a>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-2xs tracking-wide text-subtle uppercase">{label}</span>
      {children}
    </div>
  );
}

function ChipRow({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn("h-8 min-h-8 rounded-sm px-2.5 text-micro transition-[background-color,color] duration-150", value === o.value ? "bg-accent text-accent-fg" : "bg-inset text-muted hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
