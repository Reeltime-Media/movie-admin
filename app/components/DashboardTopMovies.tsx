"use client";

import Link from "next/link";
import { AdminCard } from "./AdminCard";
import { useQueryLoadingBeforeAuth, useTopTitles } from "../hooks/adminQueries";

const TOP_COUNT = 10;

export function DashboardTopMovies() {
  const { data, isLoading, isFetching, isAuthReady, error, refetch } = useTopTitles({
    page: 1,
    pageSize: TOP_COUNT,
    contentType: "single",
  });

  const movies = data?.items ?? [];
  const showLoading = useQueryLoadingBeforeAuth(isAuthReady, {
    isLoading,
    isFetching,
  });

  return (
    <AdminCard title="Top movies" action="Full report" actionHref="/reports">
      {showLoading && !movies.length ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
          <p className="text-[13px] font-semibold text-text">Could not load rankings</p>
          <p className="mt-1 text-[12px] text-text-muted">
            {error instanceof Error ? error.message : "Could not load rankings"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 text-[12px] font-bold text-brand hover:underline"
          >
            Retry
          </button>
        </div>
      ) : movies.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
          <p className="text-[13px] font-semibold text-text">No purchase data yet</p>
          <p className="mt-1 text-[12px] text-text-muted">
            Rankings appear once customers buy or watch movies.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-text-muted">Top {TOP_COUNT} by purchases.</p>
          {movies.map((movie, index) => {
            const rank = index + 1;
            return (
              <Link
                key={movie.id}
                href={`/movie/${movie.id}`}
                className="block rounded-md border border-border bg-bg p-3 transition-colors hover:border-border-hover hover:bg-surface-elevated"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">
                        {rank}
                      </span>
                      <span className="truncate text-[13px] font-bold text-text">
                        {movie.title}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      {movie.purchase_count} purchase{movie.purchase_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}
