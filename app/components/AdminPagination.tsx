"use client";

type AdminPaginationProps = {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

export function AdminPagination({
  page,
  pages,
  total,
  pageSize,
  onPageChange,
  isLoading = false,
}: AdminPaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-[12px] text-text-muted">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded border border-border px-3 py-1.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-16 text-center text-[12px] tabular-nums text-text-muted">
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={isLoading || page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="rounded border border-border px-3 py-1.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
