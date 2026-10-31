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
  fillHeight = false,
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
  /** Stretch to parent height (dashboard single-screen layout). */
  fillHeight?: boolean;
}) {
  // A "plus" action creates something — that's the page's primary action.
  // Everything else (Refresh, Full report, All transactions) is navigational.
  const isCreate = actionIcon === "plus";
  const icon = isCreate ? <Plus size={14} aria-hidden /> : undefined;
  const actionVariant = isCreate ? "primary" : "ghost";
  // Ghost text sits on the card's right edge, in line with the content below it.
  const actionClass = isCreate ? undefined : "-mr-2.5";
  return (
    <section
      className={[
        "overflow-hidden rounded-xl border border-border bg-surface",
        fillHeight ? "flex h-full min-h-0 flex-col" : "",
      ].join(" ")}
    >
      <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 px-5 pt-3">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        {headerAction ? (
          headerAction
        ) : action && actionHref ? (
          <Button href={actionHref} variant={actionVariant} size="sm" icon={icon} className={actionClass}>
            {action}
          </Button>
        ) : action ? (
          <Button
            type="button"
            onClick={actionOnClick}
            variant={actionVariant}
            size="sm"
            icon={icon}
            className={actionClass}
          >
            {action}
          </Button>
        ) : null}
      </div>
      <div
        className={[
          flush ? "px-5 pb-4 pt-2" : "px-5 pb-5 pt-2",
          fillHeight ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "",
        ].join(" ")}
      >
        {children}
      </div>
    </section>
  );
}
