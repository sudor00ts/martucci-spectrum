import { Maximize2, Pause, RotateCcw, Snowflake, ZoomIn, ZoomOut } from "lucide-react";
import { useAnalyzerStore } from "@/lib/analyzer-store";
import { BrandMark } from "@/components/analyzer/BrandMark";
import { OfflineBadge } from "@/components/analyzer/OfflineBadge";
import { Button } from "@/components/ui/button";
import { formatHz } from "@/lib/utils";

type Props = { onUnlock?: () => void; online?: boolean };

export function LandscapeHud({ onUnlock, online = true }: Props) {
  const frozen = useAnalyzerStore((s) => s.frozen);
  const toggleFrozen = useAnalyzerStore((s) => s.toggleFrozen);
  const zoomIn = useAnalyzerStore((s) => s.zoomIn);
  const zoomOut = useAnalyzerStore((s) => s.zoomOut);
  const resetZoom = useAnalyzerStore((s) => s.resetZoom);
  const zoomToSelection = useAnalyzerStore((s) => s.zoomToSelection);
  const selectedHz = useAnalyzerStore((s) => s.selectedHz);
  const bandMin = useAnalyzerStore((s) => s.bandMin);
  const bandMax = useAnalyzerStore((s) => s.bandMax);
  const zoomMin = useAnalyzerStore((s) => s.zoomMin);
  const zoomMax = useAnalyzerStore((s) => s.zoomMax);
  const hasBand = bandMin != null && bandMax != null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-2">
      <div className="pointer-events-auto flex items-center gap-1.5">
        <BrandMark compact className="mr-auto" />
        <OfflineBadge online={online} />
        <Button variant="toggle" pressed={frozen} onClick={toggleFrozen} aria-pressed={frozen} aria-label="Detener medidor" size="md">
          {frozen ? <Pause className="size-4" strokeWidth={1.75} /> : <Snowflake className="size-4" strokeWidth={1.75} />}
          Hold
        </Button>
        <Button variant="outline" size="icon" onClick={zoomOut} aria-label="Alejar"><ZoomOut className="size-4" strokeWidth={1.75} /></Button>
        <Button variant="outline" size="icon" onClick={zoomIn} aria-label="Acercar"><ZoomIn className="size-4" strokeWidth={1.75} /></Button>
        <Button variant="outline" size="icon" onClick={resetZoom} aria-label="Zoom completo"><Maximize2 className="size-4" strokeWidth={1.75} /></Button>
        {(hasBand || selectedHz != null) && (
          <Button variant="primary" size="md" onClick={zoomToSelection}>Zoom</Button>
        )}
        {onUnlock ? (
          <Button variant="ghost" size="icon-sm" onClick={onUnlock} aria-label="Reiniciar audio">
            <RotateCcw className="size-3.5" strokeWidth={1.75} />
          </Button>
        ) : null}
      </div>
      <div className="pointer-events-none flex items-end justify-between gap-2 px-1 pb-0.5">
        <p className="max-w-[70%] text-micro text-muted">Tocá una frecuencia · arrastrá una banda · pellizcá para zoom · doble toque restablece</p>
        <p className="font-mono text-micro tabular-nums text-fg">
          {hasBand ? `${formatHz(bandMin)} – ${formatHz(bandMax!)}` : selectedHz != null ? formatHz(selectedHz) : `${formatHz(zoomMin)} – ${formatHz(zoomMax)}`}
        </p>
      </div>
    </div>
  );
}
