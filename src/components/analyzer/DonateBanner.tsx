import { useEffect, useState } from "react";
import { Heart, X } from "lucide-react";
import { DONATE_ALIAS, DONATE_URL } from "@/lib/donate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "martucci-donate-hidden";

export function DonateBanner() {
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

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

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (hidden) return null;

  return (
    <div className="flex h-8 shrink-0 items-center gap-1.5 border-t border-fg/10 bg-elevated px-2">
      <Heart className="size-3 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
      <p className="min-w-0 truncate text-2xs text-muted">
        Gratis · doná con <span className="font-mono text-fg">{DONATE_ALIAS}</span>
      </p>
      <Button variant="primary" size="sm" className="ml-auto h-6 min-h-6 px-2 text-2xs" onClick={() => void donate()}>
        {copied ? "Copiado" : "Donar"}
      </Button>
      <Button variant="ghost" size="icon-sm" className="size-6 min-h-6 min-w-6" onClick={dismiss} aria-label="Ocultar donación">
        <X className="size-3" strokeWidth={1.75} />
      </Button>
    </div>
  );
}
