"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { listAdminTopTitles, type ApiTopTitleReport } from "../lib/api";

function titleTypeLabel(type: string) {
  if (type === "single") return "Movie";
  if (type === "episode") return "Episode";
  return type;
}

export function ReportsTopTitles() {
  const [titles, setTitles] = useState<ApiTopTitleReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTitles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTitles(await listAdminTopTitles());
    } catch (err) {
      setTitles([]);
      setError(err instanceof Error ? err.message : "Could not load report data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTitles();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTitles]);

  const maxRevenue = Math.max(
    ...titles.map((item) => Number.parseFloat(item.revenue_usd) || 0),
    0,
  );

  return (
    <AdminCard title="Top titles" action="Refresh" actionOnClick={loadTitles}>
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
            const width =
              maxRevenue > 0
                ? Math.max(12, Math.round((revenue / maxRevenue) * 100))
                : Math.max(12, 90 - index * 10);
            return (
              <div key={item.id}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-bold">
                    {index + 1}. {item.title}
                  </span>
                  <span className="text-text-muted">${item.revenue_usd}</span>
                </div>
                <div className="mt-1 text-[11px] text-text-muted">
                  {titleTypeLabel(item.type)} · {item.purchase_count} purchases · {item.watch_count} watches ·{" "}
                  {item.completion_count} completions
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}
