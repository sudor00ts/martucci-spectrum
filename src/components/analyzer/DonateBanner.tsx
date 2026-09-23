import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { DONATE_ALIAS, DONATE_AMOUNTS, DONATE_URL, loadMercadoPagoSdk } from "@/lib/donate";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "martucci-donate-welcome";

export function DonateBanner() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState(2500);
  const [custom, setCustom] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "fallback" | "error">("idle");
  const [message, setMessage] = useState("");
  const brickRef = useRef<{ unmount?: () => void } | null>(null);

  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem(SESSION_KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      brickRef.current?.unmount?.();
      brickRef.current = null;
    };
  }, []);

  function close() {
    setOpen(false);
    brickRef.current?.unmount?.();
    brickRef.current = null;
    setStatus("idle");
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function copyAlias() {
    try {
      await navigator.clipboard.writeText(DONATE_ALIAS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard may be blocked */
    }
  }

  async function startCheckout() {
    const pesos = custom ? Math.round(Number(custom.replace(",", "."))) : amount;
    setStatus("loading");
    setMessage("");
    brickRef.current?.unmount?.();
    brickRef.current = null;
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pesos }),
      });
      const data = (await res.json()) as {
        configured?: boolean;
        preferenceId?: string;
        publicKey?: string;
        initPoint?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar Mercado Pago");
      if (!data.configured || !data.preferenceId || !data.publicKey) {
        setStatus("fallback");
        await copyAlias();
        window.open(DONATE_URL, "_blank", "noopener,noreferrer");
        return;
      }
      await loadMercadoPagoSdk();
      if (!window.MercadoPago) throw new Error("SDK de Mercado Pago no disponible");
      const mp = new window.MercadoPago(data.publicKey, { locale: "es-AR" });
      brickRef.current = await mp.bricks().create("wallet", "mp-wallet-brick", {
        initialization: { preferenceId: data.preferenceId },
        customization: { texts: { valueProp: "security_safety" } },
      });
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Error al conectar Mercado Pago");
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
              Si te sirve, podés donar con Mercado Pago.
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
                    setStatus("idle");
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
                onChange={(e) => {
                  setCustom(e.target.value);
                  setStatus("idle");
                }}
                className="w-20 rounded-sm border border-white/10 bg-transparent px-2 py-1 text-[11px] text-fg"
                aria-label="Otro monto"
              />
            </div>
            <div id="mp-wallet-brick" className="mt-3 min-h-10" />
            {status === "fallback" && (
              <p className="mt-2 text-[11px] text-muted">
                Alias copiado: <span className="font-mono text-fg">{DONATE_ALIAS}</span>
              </p>
            )}
            {status === "error" && <p className="mt-2 text-[11px] text-red-400">{message}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => void copyAlias()}>
                {copied ? "Alias copiado" : DONATE_ALIAS}
              </Button>
              <Button variant="ghost" size="sm" onClick={close}>
                Cerrar
              </Button>
              <Button variant="primary" size="sm" disabled={status === "loading"} onClick={() => void startCheckout()}>
                {status === "loading" ? "Conectando…" : status === "ready" ? "Actualizar monto" : "Donar"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {!open && (
        <button
          type="button"
          className="fixed bottom-2 left-2 z-40 flex size-8 items-center justify-center rounded-full bg-bg/55 text-accent shadow-[0_4px_16px_rgb(0_0_0_/_0.28)] backdrop-blur-md"
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
