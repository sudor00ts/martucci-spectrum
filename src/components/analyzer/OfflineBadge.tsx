export function OfflineBadge({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <span className="rounded-sm bg-elevated px-2 py-0.5 font-mono text-2xs tracking-wide text-accent uppercase">
      Sin red
    </span>
  );
}
