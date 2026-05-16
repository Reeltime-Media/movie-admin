import Link from "next/link";

export function AdminCard({
  title,
  children,
  action,
  actionHref,
  actionOnClick,
}: {
  title: string;
  children: React.ReactNode;
  action?: string;
  actionHref?: string;
  actionOnClick?: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-[14px] font-bold tracking-[-0.01em]">{title}</h2>
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
      <div className="p-5">{children}</div>
    </section>
  );
}
