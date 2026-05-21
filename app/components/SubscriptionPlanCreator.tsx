"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { useMovieCatalog } from "./MovieCatalogProvider";
import { listAllAdminSeries, updateSeriesApi, type ApiSeries } from "../lib/api";

export function SubscriptionPlanCreator() {
  const { refreshMovies } = useMovieCatalog();
  const [series, setSeries] = useState<ApiSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSeries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSeries(await listAllAdminSeries());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load series";
      setError(message);
      setSeries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSeries();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSeries]);

  const togglePublished = async (item: ApiSeries) => {
    setIsSaving(true);
    try {
      const updated = await updateSeriesApi(item.slug, { is_published: !item.is_published });
      setSeries((prev) =>
        prev.map((seriesItem) => (seriesItem.id === updated.id ? updated : seriesItem)),
      );
      await refreshMovies();
      toast.success(
        updated.is_published ? "Series subscription published" : "Series subscription unpublished",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update subscription status");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminCard title="Series" action="Add series" actionHref="/movie/new">
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-text-muted">
          All series are included in the Reeltime Plus subscription. Publish a series to make it
          available to subscribers.
        </p>

        {error ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
            <div>{error}</div>
            <button type="button" onClick={loadSeries} className="mt-2 font-bold hover:underline">
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <p className="text-[13px] text-text-muted">Loading series...</p>
        ) : series.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-muted">No series yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {series.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-bg p-4"
              >
                <div className="flex-1">
                  <h3 className="text-[13px] font-bold">{item.title}</h3>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {item.genres.join(", ") || "No genres"} ·{" "}
                    {item.is_published ? "Published" : "Draft"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void togglePublished(item)}
                  disabled={isSaving}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:opacity-40"
                >
                  {item.is_published ? "Unpublish" : "Publish"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminCard>
  );
}
