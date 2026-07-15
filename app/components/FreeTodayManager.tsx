"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { AdminCatalogSearchBar } from "./AdminCatalogSearchBar";
import { Button } from "./ui/Button";
import { InlineLoading } from "./InlineLoading";
import {
  createAdminFreeToday,
  deleteAdminFreeToday,
  listAdminFreeToday,
  listAllAdminMovies,
  updateAdminFreeToday,
  type ApiContent,
  type ApiFreeTodayItem,
} from "../lib/api";
import { adminDeleteButtonClassWide, adminPrimaryButtonClass } from "../lib/adminUi";
import { mediaUrl } from "../lib/media";
import { queryKeys } from "../lib/queryKeys";

const MAX_PICKS = 10;

export function FreeTodayManager() {
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({
    queryKey: queryKeys.freeToday,
    queryFn: listAdminFreeToday,
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
      : "Could not load free movies."
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
    void queryClient.invalidateQueries({ queryKey: queryKeys.freeToday });
  };

  const handleAdd = async (movie: ApiContent) => {
    setIsSaving(true);
    try {
      await createAdminFreeToday({ contentId: movie.id, sortOrder: items.length });
      invalidate();
      toast.success(`"${movie.title}" is free today.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the movie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (item: ApiFreeTodayItem) => {
    const label = item.content_title ?? "this movie";
    if (!window.confirm(`Remove "${label}" from Free movies today? It becomes paid again immediately.`)) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteAdminFreeToday(item.id);
      invalidate();
      toast.success("Removed — normal pricing applies again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the movie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderChange = async (item: ApiFreeTodayItem, value: string) => {
    const sortOrder = Number.parseInt(value, 10);
    if (Number.isNaN(sortOrder) || sortOrder === item.sort_order) return;
    setIsSaving(true);
    try {
      await updateAdminFreeToday(item.id, { sortOrder });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reorder.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AdminCard
        title={`Free movies today · ${items.length}/${MAX_PICKS}`}
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
          Movies listed here are <strong className="font-semibold text-text">free to watch
          for everyone</strong> while listed — no purchase or subscription needed. Remove a
          movie and normal pricing applies again immediately. Up to {MAX_PICKS} picks; lower
          order shows first on the home page.
        </p>

        {isLoading && !items.length ? (
          <InlineLoading label="Loading free movies" />
        ) : error ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-xs text-warning">
            <div>{error}</div>
            {error.includes("free_today_items") ? (
              <p className="mt-2 text-2xs">Run: cd movie-api && alembic upgrade head (or restart the api container)</p>
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
            <p className="text-sm text-text-muted">No free movies picked yet.</p>
            <p className="mt-1 text-xs text-text-disabled">
              Click &ldquo;Add movie&rdquo; to make up to {MAX_PICKS} titles free on the home page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const thumb = mediaUrl(item.poster_key);
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-bg p-4"
                >
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated">
                    {thumb ? (
                      <Image src={thumb} alt="" fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xs text-text-disabled">
                        No poster
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold">
                        {item.content_title ?? "Unknown title"}
                      </h3>
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-success">
                        Free
                      </span>
                    </div>
                    {item.content_slug ? (
                      <p className="mt-1 text-2xs text-text-muted">{item.content_slug}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="flex items-center gap-1.5 text-2xs font-semibold text-text-muted">
                      Order
                      <input
                        type="number"
                        defaultValue={item.sort_order}
                        onBlur={(e) => void handleOrderChange(item, e.target.value)}
                        disabled={isSaving}
                        className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none focus:border-brand/40"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleRemove(item)}
                      disabled={isSaving}
                      className={adminDeleteButtonClassWide}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>

      {showPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_80px_-12px_rgba(0,0,0,0.18)]">
            <div className="relative border-b border-border px-6 py-5">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand via-brand-hover to-brand/60" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[17px] font-bold tracking-[-0.02em]">Add a free movie</h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    The movie becomes free to watch for everyone the moment you add it.
                    {" "}{items.length}/{MAX_PICKS} picked.
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

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <AdminCatalogSearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search movies by title or slug…"
                resultCount={filteredMovies.length}
                totalCount={movies.length}
              />
              <div className="mt-4 max-h-[340px] overflow-y-auto rounded-lg border border-border">
                {moviesLoading ? (
                  <p className="py-6 text-center text-xs text-text-muted">Loading movies…</p>
                ) : moviesError ? (
                  <p className="py-6 text-center text-xs text-warning">{moviesError}</p>
                ) : filteredMovies.length === 0 ? (
                  <p className="py-6 text-center text-xs text-text-muted">No movies match.</p>
                ) : (
                  filteredMovies.map((movie, idx) => {
                    const listed = listedIds.has(movie.id);
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
                        {listed ? (
                          <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-success">
                            Free
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="shrink-0"
                            onClick={() => void handleAdd(movie)}
                            disabled={isSaving || atLimit}
                          >
                            Make free
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
