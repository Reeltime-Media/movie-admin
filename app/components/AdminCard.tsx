import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "./ui/Button";

export function AdminCard({
  title,
  children,
  action,
  actionHref,
  actionOnClick,
  actionIcon = "none",
  headerAction,
  flush = false,
}: {
  title: string;
  children: ReactNode;
  action?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  /** Only "add"-style actions get a plus; "Refresh"/"Full report" etc. take none. */
  actionIcon?: "plus" | "none";
  /** Custom header control (e.g. a primary button); takes precedence over `action`. */
  headerAction?: ReactNode;
  /** Table-heavy cards: body has horizontal padding only; no extra inner padding on tables */
  flush?: boolean;
}) {
  const icon = actionIcon === "plus" ? <Plus size={14} aria-hidden /> : undefined;
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-text">{title}</h2>
        {headerAction ? (
          headerAction
        ) : action && actionHref ? (
          <Button href={actionHref} variant="secondary" size="sm" icon={icon}>
            {action}
          </Button>
        ) : action ? (
          <Button type="button" onClick={actionOnClick} variant="secondary" size="sm" icon={icon}>
            {action}
          </Button>
        ) : null}
      </div>
      <div className={flush ? "px-5 pb-5 pt-4" : "p-5"}>{children}</div>
    </section>
  );
}
