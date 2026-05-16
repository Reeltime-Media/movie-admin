"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { useMovieCatalog } from "./MovieCatalogProvider";
import { listAdminSeries, updateSeriesApi, type ApiSeries } from "../lib/api";

const textInputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated";

export function SubscriptionPlanCreator() {
  const { refreshMovies } = useMovieCatalog();
  const [series, setSeries] = useState<ApiSeries[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSeries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSeries(await listAdminSeries());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load subscription pricing";
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

  const startEdit = (item: ApiSeries) => {
    setEditingSlug(item.slug);
    setPriceDraft(item.monthly_price_usd ?? "");
  };

  const savePrice = async (item: ApiSeries) => {
    const normalized = priceDraft.replace(/[$,\s]/g, "");
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      toast.warning("Enter a valid monthly price.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateSeriesApi(item.slug, { monthly_price_usd: normalized });
      setSeries((prev) =>
        prev.map((seriesItem) => (seriesItem.id === updated.id ? updated : seriesItem)),
      );
      await refreshMovies();
      setEditingSlug(null);
      toast.success("Subscription price updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update subscription price");
    } finally {
      setIsSaving(false);
    }
  };

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
    <AdminCard title="Series subscription pricing" action="Add series" actionHref="/movie/new">
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-text-muted">
          Subscription products are backed by published series. Update monthly prices here; create
          new subscription products by adding a series.
        </p>

        {error ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
            <div>{error}</div>
            <button type="button" onClick={loadSeries} className="mt-2 font-bold hover:underline">
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <p className="text-[13px] text-text-muted">Loading subscription pricing...</p>
        ) : series.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px] text-text-muted">No series subscription products yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {series.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-border bg-bg p-4"
              >
                <div className="flex-1">
                  <h3 className="text-[13px] font-bold">{item.title}</h3>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {item.genres.join(", ") || "No genres"} ·{" "}
                    {item.is_published ? "Published" : "Draft"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
                    {editingSlug === item.slug ? (
                      <>
                        <span className="font-semibold text-text-muted">$</span>
                        <input
                          className={`${textInputClass} max-w-32`}
                          inputMode="decimal"
                          value={priceDraft}
                          onChange={(e) => setPriceDraft(e.target.value)}
                        />
                        <span className="text-text-muted">/ month</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-brand">${item.monthly_price_usd}</span>
                        <span className="text-text-muted">/ month</span>
                      </>
                    )}
                  </div>
                </div>
                {editingSlug === item.slug ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void savePrice(item)}
                      disabled={isSaving}
                      className="rounded-md bg-brand px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSlug(null)}
                      disabled={isSaving}
                      className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                    >
                      Edit price
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePublished(item)}
                      disabled={isSaving}
                      className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:opacity-40"
                    >
                      {item.is_published ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminCard>
  );
}
