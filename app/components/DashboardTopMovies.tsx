"use client";

import { useRouter } from "next/navigation";
import { AdminCard } from "./AdminCard";
import { useQueryLoadingBeforeAuth, useTopTitles } from "../hooks/adminQueries";

const TOP_COUNT = 10;

export function DashboardTopMovies() {
  const router = useRouter();
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
    <AdminCard title="Top movies" action="Full report" actionHref="/reports" flush>
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
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-text-disabled">
                <th className="w-10 px-5 pb-2 font-bold">#</th>
                <th className="px-5 pb-2 font-bold">Title</th>
                <th className="px-5 pb-2 text-right font-bold">Purchases</th>
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
                    className="cursor-pointer transition-colors hover:bg-surface-elevated"
                  >
                    <td className="px-5 py-2.5 font-bold tabular-nums text-brand">{rank}</td>
                    <td className="px-5 py-2.5 font-semibold text-text">{movie.title}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-text-muted">
                      {movie.purchase_count}
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
