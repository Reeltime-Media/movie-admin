"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "./AdminCard";
import { listAdminTopTitles, type ApiTopTitleReport } from "../lib/api";

const TOP_COUNT = 10;

export function DashboardTopMovies() {
  const [movies, setMovies] = useState<ApiTopTitleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminTopTitles({
        page: 1,
        pageSize: TOP_COUNT,
        contentType: "single",
      });
      setMovies(res.items);
    } catch (err) {
      setMovies([]);
      setError(err instanceof Error ? err.message : "Could not load top movies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const maxPurchases = Math.max(...movies.map((m) => m.purchase_count), 0);

  return (
    <AdminCard title="Top movies" action="Full report" actionHref="/reports">
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
          <p className="text-[13px] font-semibold text-text">Could not load rankings</p>
          <p className="mt-1 text-[12px] text-text-muted">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
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
          <p className="text-[12px] text-text-muted">
            Top {TOP_COUNT} by purchases, then unique viewers.
          </p>
          {movies.map((movie, index) => {
            const rank = index + 1;
            const barWidth =
              maxPurchases > 0
                ? Math.max(8, Math.round((movie.purchase_count / maxPurchases) * 100))
                : Math.max(8, 100 - index * 8);
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
                      {" · "}
                      {movie.watch_count} viewer{movie.watch_count !== 1 ? "s" : ""}
                      {Number.parseFloat(movie.revenue_usd) > 0
                        ? ` · $${movie.revenue_usd} revenue`
                        : null}
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}
