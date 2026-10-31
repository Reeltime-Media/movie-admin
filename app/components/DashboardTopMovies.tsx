"use client";

import { useRouter } from "next/navigation";
import { AdminCard } from "./AdminCard";
import { useQueryLoadingBeforeAuth, useTopTitles } from "../hooks/adminQueries";

export function DashboardTopMovies({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const topCount = compact ? 8 : 10;
  const { data, isLoading, isFetching, isAuthReady, error, refetch } = useTopTitles({
    page: 1,
    pageSize: topCount,
    contentType: "single",
  });

  const movies = data?.items ?? [];
  const showLoading = useQueryLoadingBeforeAuth(isAuthReady, {
    isLoading,
    isFetching,
  });

  const cellPad = compact ? "px-4 py-1.5" : "px-5 py-2.5";

  return (
    <AdminCard
      title="Top movies"
      action="Full report"
      actionHref="/reports"
      flush
      fillHeight={compact}
    >
      {showLoading && !movies.length ? (
        <div className={`flex items-center justify-center ${compact ? "h-full" : "h-40"}`}>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
        </div>
      ) : error ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-semibold text-text">Could not load rankings</p>
          <p className="mt-1 text-xs text-text-muted">
            {error instanceof Error ? error.message : "Could not load rankings"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 text-xs font-medium text-brand hover:underline"
          >
            Retry
          </button>
        </div>
      ) : movies.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-semibold text-text">No purchase data yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Rankings appear once customers buy or watch movies.
          </p>
        </div>
      ) : compact ? (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 justify-between border-b border-border pb-2 text-xs text-text-muted">
            <span>Title</span>
            <span>Purchases</span>
          </div>
          <ul className="flex min-h-0 flex-1 flex-col justify-evenly">
            {movies.map((movie, index) => {
              const rank = index + 1;
              const goToMovie = () => router.push(`/movie/${movie.id}`);
              return (
                <li key={movie.id} className="min-h-0">
                  <button
                    type="button"
                    onClick={goToMovie}
                    className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-soft"
                  >
                    <span className="w-6 shrink-0 tabular-nums text-text-disabled">{rank}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-text">
                      {movie.title}
                    </span>
                    <span className="shrink-0 pl-3 tabular-nums text-text-muted">
                      {movie.purchase_count.toLocaleString()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className={`w-10 font-medium px-5 pb-2`}>#</th>
                <th className={`font-medium px-5 pb-2`}>Title</th>
                <th className={`text-right font-medium px-5 pb-2`}>Purchases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movies.map((movie, index) => {
                const rank = index + 1;
                const goToMovie = () => router.push(`/movie/${movie.id}`);
                return (
                  <tr
                    key={movie.id}
                    role="link"
                    tabIndex={0}
                    onClick={goToMovie}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        goToMovie();
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-surface-soft"
                  >
                    <td className={`${cellPad} tabular-nums text-text-disabled`}>{rank}</td>
                    <td className={`${cellPad} max-w-0 truncate font-medium text-text`}>
                      {movie.title}
                    </td>
                    <td className={`${cellPad} text-right tabular-nums text-text-muted`}>
                      {movie.purchase_count.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
