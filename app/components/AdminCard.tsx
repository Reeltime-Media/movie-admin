import Link from "next/link";
import type { ReactNode } from "react";

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M7 1.75V12.25M1.75 7H12.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const actionButtonClass = [
  "group inline-flex items-center gap-1.5",
  "rounded-lg bg-brand px-3.5 py-2",
  "text-[12px] font-bold text-white",
  "shadow-[0_1px_3px_rgba(229,9,20,0.25),0_0_0_1px_rgba(229,9,20,0.08)]",
  "transition-all duration-200 ease-out",
  "hover:bg-brand-hover hover:shadow-[0_2px_8px_rgba(229,9,20,0.35),0_0_0_1px_rgba(229,9,20,0.12)]",
  "hover:scale-[1.02]",
  "active:scale-[0.98] active:shadow-none",
].join(" ");

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
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-[14px] font-bold tracking-[-0.01em] text-text">{title}</h2>
        {headerAction ? (
          headerAction
        ) : action && actionHref ? (
          <Link href={actionHref} className={actionButtonClass}>
            <PlusIcon />
            {action}
          </Link>
        ) : action ? (
          <button
            type="button"
            onClick={actionOnClick}
            className={actionButtonClass}
          >
            <PlusIcon />
            {action}
          </button>
        ) : null}
      </div>
      <div className={flush ? "px-5 pb-5 pt-4" : "p-5"}>{children}</div>
    </section>
  );
}
