import Link from "next/link";
import type { ReactNode } from "react";

export function AdminCard({
  title,
  children,
  action,
  actionHref,
  actionOnClick,
  flush = false,
}: {
  title: string;
  children: ReactNode;
  action?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  /** Table-heavy cards: body has horizontal padding only; no extra inner padding on tables */
  flush?: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-[14px] font-bold tracking-[-0.01em] text-text">{title}</h2>
        {action && actionHref ? (
          <Link
            href={actionHref}
            className="text-[12px] font-semibold text-text-muted transition-colors hover:text-text"
          >
            {action}
          </Link>
        ) : action ? (
          <button
            type="button"
            onClick={actionOnClick}
            className="text-[12px] font-semibold text-text-muted transition-colors hover:text-text"
          >
            {action}
          </button>
        ) : null}
      </div>
      <div className={flush ? "px-5 pb-5 pt-4" : "p-5"}>{children}</div>
    </section>
  );
}
