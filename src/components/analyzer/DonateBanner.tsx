import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { DONATE_ALIAS, DONATE_AMOUNTS } from "@/lib/donate";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "martucci-donate-welcome";

export function DonateBanner() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState(2500);
  const [custom, setCustom] = useState("");

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

  const pesos = custom ? Math.round(Number(custom.replace(",", "."))) : amount;

  async function copyAlias() {
    const text = Number.isFinite(pesos) && pesos > 0
      ? `${DONATE_ALIAS}\nTransferencia sugerida: $${pesos.toLocaleString("es-AR")}`
      : DONATE_ALIAS;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard may be blocked */
    }
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
              Si te sirve, podés donar con una transferencia a este alias. Así llega el 100%, sin comisión de Mercado Pago.
            </p>
            <button
              type="button"
              onClick={() => void copyAlias()}
              className="mt-3 flex w-full items-center justify-between rounded-md border border-accent/40 bg-accent/10 px-3 py-2.5 text-left"
            >
              <span>
                <span className="block text-[10px] tracking-[0.14em] text-muted uppercase">Alias Mercado Pago</span>
                <span className="mt-0.5 block font-mono text-lg text-fg">{DONATE_ALIAS}</span>
              </span>
              <span className="text-[11px] text-accent">{copied ? "Copiado" : "Copiar"}</span>
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              En Mercado Pago o tu banco: Transferir → alias → pegá <span className="font-mono text-fg">{DONATE_ALIAS}</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {DONATE_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-sm border px-2 py-1 text-[11px] ${
                    !custom && amount === value ? "border-accent bg-accent/15 text-fg" : "border-white/10 text-muted"
                  }`}
                  onClick={() => {
                    setAmount(value);
                    setCustom("");
                  }}
                >
                  ${value.toLocaleString("es-AR")}
                </button>
              ))}
              <input
                type="number"
                min={100}
                inputMode="numeric"
                placeholder="Otro"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="w-20 rounded-sm border border-white/10 bg-transparent px-2 py-1 text-[11px] text-fg"
                aria-label="Otro monto"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={close}>
                Cerrar
              </Button>
              <Button variant="primary" size="sm" onClick={() => void copyAlias()}>
                {copied ? "Alias copiado" : "Copiar alias"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-3 right-3 z-40 flex size-9 items-center justify-center rounded-full border border-white/10 bg-bg/70 text-accent shadow-lg backdrop-blur-md"
          aria-label="Donar"
          title={`Donar a ${DONATE_ALIAS}`}
        >
          <Heart className="size-4" fill="currentColor" />
        </button>
      )}
    </>
  );
}
