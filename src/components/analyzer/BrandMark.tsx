import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  word?: boolean;
  compact?: boolean;
};

export function BrandMark({ className, word = true, compact = false }: Props) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className={cn("shrink-0 text-accent", compact ? "size-7" : "size-9")} aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="6" fill="currentColor" />
        <g fill="var(--color-bg)" transform="translate(16 18.5)">
          <polygon points="0,-12.2 1.85,0.4 -1.85,0.4" />
          <polygon points="0,-10.6 1.7,0.3 -1.7,0.3" transform="rotate(-38)" />
          <polygon points="0,-10.6 1.7,0.3 -1.7,0.3" transform="rotate(38)" />
          <polygon points="0,-8.8 1.55,0.2 -1.55,0.2" transform="rotate(-76)" />
          <polygon points="0,-8.8 1.55,0.2 -1.55,0.2" transform="rotate(76)" />
          <rect x="-0.75" y="0" width="1.5" height="7.2" rx="0.6" />
        </g>
      </svg>
      {word ? (
        <div className="min-w-0 leading-none">
          <p className={cn("font-display font-bold tracking-[0.14em] text-fg uppercase italic", compact ? "text-[15px]" : "text-[1.2rem] md:text-[1.35rem]")}>
            Martucci
          </p>
          {!compact ? (
            <p className="mt-1 hidden text-[0.625rem] tracking-[0.18em] text-muted uppercase sm:block">Spectrum</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
