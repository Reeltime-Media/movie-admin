export function AdminStatCard({
  label,
  value,
  hint,
  hintClassName = "text-text-muted",
  attention = false,
  compact = false,
}: {
  label: string;
  value: string;
  hint?: string;
  hintClassName?: string;
  /** Soft warning accent for queues that need attention. */
  attention?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-xl border bg-surface transition-colors",
        compact ? "p-3" : "p-5",
        attention
          ? "border-warning/35 hover:border-warning/50"
          : "border-border hover:border-border-hover",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="text-2xs font-semibold uppercase tracking-[0.14em] text-text-disabled">
        {label}
      </div>
      <div
        className={[
          "font-semibold tracking-[-0.02em] text-text tabular-nums",
          compact ? "mt-1.5 text-xl" : "mt-3 text-stat",
        ].join(" ")}
      >
        {value}
      </div>
      {hint ? (
        <div className={`mt-1 text-xs font-medium ${hintClassName}`}>{hint}</div>
      ) : null}
    </div>
  );
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
