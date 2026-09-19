import { Share, SquarePlus, X } from "lucide-react";
import type { InstallPlatform } from "@/lib/use-pwa-install";
import { BrandMark } from "@/components/analyzer/BrandMark";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  platform: InstallPlatform;
  canPrompt: boolean;
  onClose: () => void;
  onPrompt: () => void;
};

export function InstallSheet({ open, platform, canPrompt, onClose, onPrompt }: Props) {
  if (!open) return null;
  const ios = platform === "ios";
  const windows = platform === "windows";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-3 md:items-center">
      <div role="dialog" aria-labelledby="install-title" className="w-full max-w-md rounded-lg bg-surface p-5 shadow-[var(--shadow-panel)]">
        <div className="flex items-start justify-between gap-3">
          <BrandMark />
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar">
            <X className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
        <h2 id="install-title" className="mt-4 font-display text-lg font-bold tracking-[0.12em] text-fg uppercase italic">
          Instalar Martucci
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Se instala como app del sistema, sin App Store ni Microsoft Store. Después de la primera visita, Demo y el micrófono andan sin internet.
        </p>
        {canPrompt ? (
          <Button variant="primary" size="md" className="mt-4 w-full" onClick={onPrompt}>Instalar ahora</Button>
        ) : null}
        {ios ? (
          <ol className="mt-4 space-y-3 text-sm text-fg">
            <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-accent font-display text-sm text-accent-fg">1</span><span>En Safari, tocá <Share className="mx-0.5 inline size-3.5 align-text-bottom" /> <strong>Compartir</strong></span></li>
            <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-accent font-display text-sm text-accent-fg">2</span><span>Elegí <SquarePlus className="mx-0.5 inline size-3.5 align-text-bottom" /> <strong>Agregar a inicio</strong></span></li>
            <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-accent font-display text-sm text-accent-fg">3</span><span>Confirmá. Martucci queda como ícono, a pantalla completa.</span></li>
          </ol>
        ) : null}
        {windows && !canPrompt ? (
          <ol className="mt-4 space-y-3 text-sm text-fg">
            <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-accent font-display text-sm text-accent-fg">1</span><span>Abrí Martucci en Microsoft Edge o Google Chrome.</span></li>
            <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-accent font-display text-sm text-accent-fg">2</span><span>Menú <strong>⋯</strong> → <strong>Aplicaciones</strong> → <strong>Instalar Martucci</strong></span></li>
            <li className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-accent font-display text-sm text-accent-fg">3</span><span>Queda en el menú Inicio, como cualquier programa.</span></li>
          </ol>
        ) : null}
        {platform === "android" && !canPrompt ? (
          <p className="mt-4 text-sm text-fg">En Chrome: menú <strong>⋮</strong> → <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla de inicio</strong>.</p>
        ) : null}
        {platform === "mac" && !canPrompt ? (
          <p className="mt-4 text-sm text-fg">En Chrome o Edge: menú → <strong>Instalar Martucci</strong>. Safari en Mac no instala PWAs; usá Chrome para el acceso al Dock.</p>
        ) : null}
        {platform === "other" && !canPrompt ? (
          <p className="mt-4 text-sm text-fg">En Chrome o Edge, buscá <strong>Instalar Martucci</strong> en el menú del navegador.</p>
        ) : null}
        <p className="mt-4 text-micro leading-relaxed text-subtle">Apple no deja distribuir un instalador .ipa fuera de la App Store. Un .exe de Windows firmado pide cuenta de Microsoft. Esta vía es la oficial para una web app: gratis, y funciona en el teléfono y en la PC.</p>
      </div>
    </div>
  );
}
