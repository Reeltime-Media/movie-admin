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
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="text-[12px] font-semibold text-text-muted">{label}</div>
      <div className="mt-2 text-[26px] font-extrabold tracking-[-0.03em] text-text">{value}</div>
      {hint ? (
        <div className={`mt-1 text-[12px] font-medium ${hintClassName}`}>{hint}</div>
      ) : null}
    </div>
  );
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
