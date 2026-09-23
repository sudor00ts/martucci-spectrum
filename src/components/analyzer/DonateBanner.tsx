import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { DONATE_ALIAS, DONATE_URL } from "@/lib/donate";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "martucci-donate-welcome";

export function DonateBanner() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem(SESSION_KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function donate() {
    try {
      await navigator.clipboard.writeText(DONATE_ALIAS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard may be blocked */
    }
    window.open(DONATE_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="donate-title">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-elevated p-4 shadow-[0_24px_60px_rgb(0_0_0_/_0.45)]">
            <p id="donate-title" className="font-display text-sm font-bold tracking-[0.12em] text-fg uppercase italic">
              Martucci Spectrum
            </p>
            <p className="mt-2 text-sm leading-relaxed text-fg/85">
              Martucci es una aplicación open source, libre para todos, desarrollada por un trabajador del audio.
              Si te sirve y querés apoyar el proyecto, podés donar por Mercado Pago Argentina al alias{" "}
              <span className="font-mono text-fg">{DONATE_ALIAS}</span>.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={close}>
                Cerrar
              </Button>
              <Button variant="primary" size="sm" onClick={() => void donate()}>
                {copied ? "Alias copiado" : "Donar"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {!open && (
        <button
          type="button"
          className="absolute bottom-2 left-2 z-30 flex size-8 items-center justify-center rounded-full bg-bg/50 text-accent shadow-[0_4px_16px_rgb(0_0_0_/_0.28)] backdrop-blur-md"
          onClick={() => setOpen(true)}
          aria-label="Donar"
          title="Donar"
        >
          <Heart className="size-3.5" strokeWidth={1.9} fill="currentColor" />
        </button>
      )}
    </>
  );
}
