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
  // A "plus" action creates something — that's the page's primary action.
  // Everything else (Refresh, Full report, All transactions) is navigational.
  const isCreate = actionIcon === "plus";
  const icon = isCreate ? <Plus size={14} aria-hidden /> : undefined;
  const actionVariant = isCreate ? "primary" : "secondary";
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-text">{title}</h2>
        {headerAction ? (
          headerAction
        ) : action && actionHref ? (
          <Button href={actionHref} variant={actionVariant} size="sm" icon={icon}>
            {action}
          </Button>
        ) : action ? (
          <Button type="button" onClick={actionOnClick} variant={actionVariant} size="sm" icon={icon}>
            {action}
          </Button>
        ) : null}
      </div>
      <div className={flush ? "px-5 pb-5 pt-4" : "p-5"}>{children}</div>
    </section>
  );
}
