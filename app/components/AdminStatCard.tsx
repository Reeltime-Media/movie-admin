import { adminStatCardClass, adminStatGridClass } from "../lib/adminUi";

export function AdminStatCard({
  label,
  value,
  hint,
  hintClassName = "text-text-muted",
  compact = false,
}: {
  label: string;
  value: string;
  hint?: string;
  hintClassName?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "bg-surface px-5 py-3.5" : adminStatCardClass}>
      <div className="text-xs font-medium text-text-muted">{label}</div>
      <div
        className={[
          "font-semibold tracking-tight text-text tabular-nums",
          compact ? "mt-1 text-xl" : "mt-2 text-2xl",
        ].join(" ")}
      >
        {value}
      </div>
      {hint ? <div className={`mt-0.5 text-xs ${hintClassName}`}>{hint}</div> : null}
    </div>
  );
}

export function AdminStatGrid({ children }: { children: React.ReactNode }) {
  return <div className={adminStatGridClass}>{children}</div>;
}
