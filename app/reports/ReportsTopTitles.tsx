"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminPagination } from "../components/AdminPagination";
import { listAdminTopTitles, type ApiTopTitleReport } from "../lib/api";

const PAGE_SIZE = 10;

function titleTypeLabel(type: string) {
  if (type === "single") return "Movie";
  if (type === "episode") return "Episode";
  return type;
}

export function ReportsTopTitles() {
  const [titles, setTitles] = useState<ApiTopTitleReport[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTitles = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listAdminTopTitles({ page: targetPage, pageSize: PAGE_SIZE });
      setTitles(res.items);
      setPage(res.page);
      setPages(res.pages);
      setTotal(res.total);
    } catch (err) {
      setTitles([]);
      setError(err instanceof Error ? err.message : "Could not load report data");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTitles(page);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [page, loadTitles]);

  const maxRevenue = Math.max(
    ...titles.map((item) => Number.parseFloat(item.revenue_usd) || 0),
    0,
  );

  return (
    <AdminCard title="Top titles" action="Refresh" actionOnClick={() => loadTitles(page)}>
      {isLoading ? (
        <p className="text-[13px] text-text-muted">Loading report data...</p>
      ) : error ? (
        <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
          <p className="text-[13px] font-semibold text-text">Could not load report data</p>
          <p className="mt-1 text-[12px] text-text-muted">{error}</p>
        </div>
      ) : titles.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
          <p className="text-[13px] font-semibold text-text">No title data yet</p>
          <p className="mt-1 text-[12px] text-text-muted">
            Upload movies through the API to populate report rankings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {titles.map((item, index) => {
            const revenue = Number.parseFloat(item.revenue_usd) || 0;
            const rank = (page - 1) * PAGE_SIZE + index + 1;
            const width =
              maxRevenue > 0
                ? Math.max(12, Math.round((revenue / maxRevenue) * 100))
                : Math.max(12, 90 - index * 10);
            return (
              <div key={item.id}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-bold">
                    {rank}. {item.title}
                  </span>
                  <span className="text-text-muted">${item.revenue_usd}</span>
                </div>
                <div className="mt-1 text-[11px] text-text-muted">
                  {titleTypeLabel(item.type)} · {item.purchase_count} purchases · {item.watch_count}{" "}
                  watches · {item.completion_count} completions
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
          <AdminPagination
            page={page}
            pages={pages}
            total={total}
            pageSize={PAGE_SIZE}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        </div>
      )}
    </AdminCard>
  );
}
