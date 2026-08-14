"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { AdminCatalogSearchBar } from "./AdminCatalogSearchBar";
import { Button } from "./ui/Button";
import { InlineLoading } from "./InlineLoading";
import { SortableList, persistReorderedSort } from "./SortableList";
import {
  createAdminComingSoon,
  deleteAdminComingSoon,
  listAdminComingSoon,
  listAllAdminMovies,
  updateAdminComingSoon,
  type ApiContent,
  type ApiComingSoonItem,
} from "../lib/api";
import { adminDeleteButtonClassWide, adminPrimaryButtonClass } from "../lib/adminUi";
import { queryKeys } from "../lib/queryKeys";

const MAX_PICKS = 20;

export function ComingSoonManager() {
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({
    queryKey: queryKeys.comingSoon,
    queryFn: listAdminComingSoon,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [movies, setMovies] = useState<ApiContent[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesError, setMoviesError] = useState<string | null>(null);

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const isLoading = itemsQuery.isLoading;
  const error = itemsQuery.error
    ? itemsQuery.error instanceof Error
      ? itemsQuery.error.message
      : "Could not load Coming Soon."
    : null;
  const atLimit = items.length >= MAX_PICKS;

  useEffect(() => {
    let cancelled = false;
    listAllAdminMovies()
      .then((rows) => {
        if (!cancelled) setMovies(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setMoviesError(err instanceof Error ? err.message : "Could not load movies.");
        }
      })
      .finally(() => {
        if (!cancelled) setMoviesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showPicker) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) setShowPicker(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showPicker, isSaving]);

  const listedIds = useMemo(() => new Set(items.map((i) => i.content_id)), [items]);

  const filteredMovies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movies.filter((m) => {
      if (!q) return true;
      return m.title.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q);
    });
  }, [movies, search]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.comingSoon });
  };

  const handleAdd = async (movie: ApiContent) => {
    setIsSaving(true);
    try {
      await createAdminComingSoon({ contentId: movie.id, sortOrder: items.length });
      invalidate();
      toast.success(`"${movie.title}" added to Coming Soon.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the movie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (item: ApiComingSoonItem) => {
    const label = item.content_title ?? "this movie";
    if (!window.confirm(`Remove "${label}" from Coming Soon?`)) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteAdminComingSoon(item.id);
      invalidate();
      toast.success("Removed from Coming Soon.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the movie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorder = async (next: ApiComingSoonItem[]) => {
    const previous = items;
    const optimistic = next.map((item, index) => ({ ...item, sort_order: index }));
    queryClient.setQueryData(queryKeys.comingSoon, optimistic);
    setIsSaving(true);
    try {
      await persistReorderedSort(next, (id, sortOrder) =>
        updateAdminComingSoon(id, { sortOrder }),
      );
      toast.success("Order updated");
    } catch (err) {
      queryClient.setQueryData(queryKeys.comingSoon, previous);
      toast.error(err instanceof Error ? err.message : "Could not reorder.");
    } finally {
      setIsSaving(false);
      invalidate();
    }
  };

  return (
    <>
      <AdminCard
        title={`Coming Soon · ${items.length}/${MAX_PICKS}`}
        headerAction={
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            disabled={atLimit}
            title={atLimit ? `Limit reached — remove a movie first.` : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 ${adminPrimaryButtonClass} disabled:opacity-40`}
          >
            <Plus size={14} strokeWidth={2.5} aria-hidden />
            Add movie
          </button>
        }
      >
        <p className="mb-4 text-sm leading-relaxed text-text-muted">
          Showcase upcoming titles on the home page — even drafts without video.
          A poster is required. Up to {MAX_PICKS} picks; drag to set home order
          (top shows first).
        </p>

        {isLoading && !items.length ? (
          <InlineLoading label="Loading Coming Soon" />
        ) : error ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-xs text-warning">
            <div>{error}</div>
            {error.includes("coming_soon_items") ? (
              <p className="mt-2 text-2xs">
                Run: cd movie-api && alembic upgrade head (or restart the api container)
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void itemsQuery.refetch()}
              className="mt-2 font-bold hover:underline"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-sm text-text-muted">No Coming Soon movies yet.</p>
            <p className="mt-1 text-xs text-text-disabled">
              Click &ldquo;Add movie&rdquo; to feature up to {MAX_PICKS} upcoming titles.
            </p>
          </div>
        ) : (
          <SortableList
            items={items}
            disabled={isSaving}
            onReorder={handleReorder}
            renderItem={(item, index) => (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-mono text-2xs font-semibold tabular-nums text-text-muted">
                    #{index + 1}
                  </span>
                  <h3 className="truncate text-sm font-bold text-text">
                    {item.content_title ?? "Unknown title"}
                  </h3>
                  {item.is_published === false ? (
                    <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-2xs font-bold text-warning">
                      Draft
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemove(item)}
                  disabled={isSaving}
                  className={adminDeleteButtonClassWide}
                >
                  Remove
                </button>
              </div>
            )}
          />
        )}
      </AdminCard>

      {showPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="flex h-[min(90vh,920px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50">
            <div className="relative border-b border-border px-6 py-5">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand via-brand-hover to-brand/60" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[17px] font-bold tracking-[-0.02em]">Add Coming Soon</h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    Drafts are fine — poster required. {items.length}/{MAX_PICKS} picked.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  disabled={isSaving}
                  aria-label="Close"
                  className="shrink-0 flex items-center justify-center size-8 rounded-lg border border-border bg-bg text-text-muted transition-all hover:border-border-hover hover:bg-surface-elevated hover:text-text"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
              <AdminCatalogSearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search movies by title or slug…"
                resultCount={filteredMovies.length}
                totalCount={movies.length}
              />
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
                {moviesLoading ? (
                  <p className="py-6 text-center text-xs text-text-muted">Loading movies…</p>
                ) : moviesError ? (
                  <p className="py-6 text-center text-xs text-warning">{moviesError}</p>
                ) : filteredMovies.length === 0 ? (
                  <p className="py-6 text-center text-xs text-text-muted">No movies match.</p>
                ) : (
                  filteredMovies.map((movie, idx) => {
                    const listed = listedIds.has(movie.id);
                    const hasPoster = Boolean(movie.poster_key);
                    return (
                      <div
                        key={movie.id}
                        className={[
                          "flex w-full items-center gap-3 px-3.5 py-2.5",
                          idx > 0 ? "border-t border-border" : "",
                        ].join(" ")}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                          {movie.title}
                        </span>
                        {!movie.is_published ? (
                          <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-2xs font-bold text-warning">
                            Draft
                          </span>
                        ) : null}
                        {!hasPoster ? (
                          <span className="shrink-0 rounded-full bg-surface-elevated px-2 py-0.5 text-2xs font-bold text-text-muted">
                            No poster
                          </span>
                        ) : null}
                        {listed ? (
                          <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-brand">
                            Listed
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="shrink-0"
                            onClick={() => void handleAdd(movie)}
                            disabled={isSaving || atLimit || !hasPoster}
                            title={!hasPoster ? "Upload a poster first" : undefined}
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/50 px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPicker(false)}
                disabled={isSaving}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
