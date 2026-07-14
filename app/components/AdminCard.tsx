import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "./ui/Button";

export function AdminCard({
  title,
  children,
  action,
  actionHref,
  actionOnClick,
  headerAction,
  flush = false,
}: {
  title: string;
  children: ReactNode;
  action?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  /** Custom header control (e.g. a primary button); takes precedence over `action`. */
  headerAction?: ReactNode;
  /** Table-heavy cards: body has horizontal padding only; no extra inner padding on tables */
  flush?: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-bold tracking-[-0.01em] text-text">{title}</h2>
        {headerAction ? (
          headerAction
        ) : action && actionHref ? (
          <Button href={actionHref} size="sm" icon={<Plus size={14} aria-hidden />}>
            {action}
          </Button>
        ) : action ? (
          <Button type="button" onClick={actionOnClick} size="sm" icon={<Plus size={14} aria-hidden />}>
            {action}
          </Button>
        ) : null}
      </div>
      <div className={flush ? "px-5 pb-5 pt-4" : "p-5"}>{children}</div>
    </section>
  );
}
