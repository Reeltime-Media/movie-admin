"use client";

import { useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminErrorAlert } from "../components/AdminErrorAlert";
import { AdminPagination } from "../components/AdminPagination";
import { InlineLoading } from "../components/InlineLoading";
import { useTopTitles } from "../hooks/adminQueries";

const PAGE_SIZE = 10;

function titleTypeLabel(type: string) {
  if (type === "single") return "Movie";
  if (type === "episode") return "Episode";
  return type;
}

export function ReportsTopTitles() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useTopTitles({
    page,
    pageSize: PAGE_SIZE,
  });

  const titles = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : "Could not load report data"
    : null;

  const maxRevenue = Math.max(
    ...titles.map((item) => Number.parseFloat(item.revenue_usd) || 0),
    0,
  );

  return (
    <AdminCard title="Top titles" action="Refresh" actionOnClick={() => void refetch()} flush>
      {isLoading && !titles.length ? (
        <InlineLoading label="Loading report data" />
      ) : errorMessage ? (
        <AdminErrorAlert message={errorMessage} onRetry={() => void refetch()} />
      ) : titles.length === 0 && !isLoading ? (
        <AdminEmptyState
          title="No title data yet"
          description="Upload movies through the API to populate report rankings."
        />
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
            isLoading={isFetching}
            onPageChange={setPage}
          />
        </div>
      )}
    </AdminCard>
  );
}
