export function AdminStatCard({
  label,
  value,
  hint,
  hintClassName = "text-text-muted",
}: {
  label: string;
  value: string;
  hint?: string;
  hintClassName?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-hover">
      {/* Hairline of brand light along the top edge, revealed on hover. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="text-2xs font-semibold uppercase tracking-[0.16em] text-text-disabled">
        {label}
      </div>
      {/* Sans, not mono: at display size a monospace comma gets its own cell ("18 , 432"). */}
      <div className="mt-3 text-stat font-semibold tracking-[-0.02em] text-text tabular-nums">
        {value}
      </div>
      {hint ? <div className={`mt-1.5 text-xs font-medium ${hintClassName}`}>{hint}</div> : null}
    </div>
  );
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
