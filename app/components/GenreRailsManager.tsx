"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { AdminCatalogSearchBar } from "./AdminCatalogSearchBar";
import { AdminSelect } from "./AdminSelect";
import { Button } from "./ui/Button";
import { InlineLoading } from "./InlineLoading";
import { SortableList, persistReorderedSort } from "./SortableList";
import {
  createAdminGenreRail,
  deleteAdminGenreRail,
  listAdminGenreRails,
  listAllAdminMovies,
  updateAdminGenreRail,
  type ApiContent,
  type ApiGenreRailItem,
} from "../lib/api";
import { useGenres } from "../hooks/adminQueries";
import { GENRE_OPTIONS } from "../lib/genres";
import { adminDeleteButtonClassWide, adminInputClass, adminPrimaryButtonClass } from "../lib/adminUi";
import { queryKeys } from "../lib/queryKeys";

const MAX_PICKS = 12;

export function GenreRailsManager() {
  const queryClient = useQueryClient();
  const { data: genreRows } = useGenres();

  const genreOptions = useMemo(() => {
    const fromApi = (genreRows ?? []).map((g) => g.name).filter(Boolean);
    const merged = [...new Set([...GENRE_OPTIONS, ...fromApi])].sort((a, b) =>
      a.localeCompare(b),
    );
    return merged.map((name) => ({ value: name, label: name }));
  }, [genreRows]);

  const [selectedGenre, setSelectedGenre] = useState("Horror");

  useEffect(() => {
    if (!genreOptions.length) return;
    if (!genreOptions.some((g) => g.value === selectedGenre)) {
      setSelectedGenre(genreOptions[0]!.value);
    }
  }, [genreOptions, selectedGenre]);

  const itemsQuery = useQuery({
    queryKey: queryKeys.genreRails(selectedGenre),
    queryFn: () => listAdminGenreRails(selectedGenre),
    enabled: Boolean(selectedGenre),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [movies, setMovies] = useState<ApiContent[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesError, setMoviesError] = useState<string | null>(null);
  /** Local order for the automatic (unpinned) rail so admins can drag before/while pinning. */
  const [draftAutomatic, setDraftAutomatic] = useState<ApiContent[]>([]);

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const isLoading = itemsQuery.isLoading;
  const error = itemsQuery.error
    ? itemsQuery.error instanceof Error
      ? itemsQuery.error.message
      : "Could not load genre rail."
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

  const normalizeGenre = (label: string) =>
    label.trim().toLowerCase().replace(/[-\s]/g, "");

  /** Home rails match primary genre only (same as movie-client filterByGenreLabel). */
  const primaryGenreMatches = (m: ApiContent, genre: string) => {
    const needle = normalizeGenre(genre);
    const primary = (m.genres ?? []).map((g) => g.trim()).find(Boolean);
    return primary != null && normalizeGenre(primary) === needle;
  };

  const movieMatchesGenre = (m: ApiContent, genre: string) => {
    const needle = normalizeGenre(genre);
    if (!needle) return false;
    return (m.genres ?? []).some((g) => normalizeGenre(g) === needle);
  };

  /** Same titles the website auto-shows for this genre when nothing is curated yet. */
  const automaticRailMovies = useMemo(() => {
    return movies
      .filter((m) => m.is_published && primaryGenreMatches(m, selectedGenre))
      .slice(0, MAX_PICKS);
  }, [movies, selectedGenre]);

  useEffect(() => {
    setDraftAutomatic(automaticRailMovies);
  }, [automaticRailMovies]);

  const filteredMovies = useMemo(() => {
    const q = search.trim().toLowerCase();

    const matchesSearch = (m: ApiContent) => {
      if (!q) return true;
      const genres = (m.genres ?? []).map((g) => g.toLowerCase());
      return (
        m.title.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        genres.some((g) => g.includes(q))
      );
    };

    return [...movies].filter(matchesSearch).sort((a, b) => {
      const aMatch = primaryGenreMatches(a, selectedGenre)
        ? 0
        : movieMatchesGenre(a, selectedGenre)
          ? 1
          : 2;
      const bMatch = primaryGenreMatches(b, selectedGenre)
        ? 0
        : movieMatchesGenre(b, selectedGenre)
          ? 1
          : 2;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.title.localeCompare(b.title);
    });
  }, [movies, search, selectedGenre]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.genreRails(selectedGenre) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.genreRails() });
  };

  const handleAdd = async (movie: ApiContent) => {
    setIsSaving(true);
    try {
      await createAdminGenreRail({
        genreName: selectedGenre,
        contentId: movie.id,
        sortOrder: items.length,
      });
      invalidate();
      toast.success(`Added "${movie.title}" to ${selectedGenre}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the movie.");
    } finally {
      setIsSaving(false);
    }
  };

  const pinMoviesInOrder = async (ordered: ApiContent[], successMessage: string) => {
    if (!ordered.length) return;
    setIsSaving(true);
    try {
      for (let i = 0; i < ordered.length; i += 1) {
        const movie = ordered[i]!;
        await createAdminGenreRail({
          genreName: selectedGenre,
          contentId: movie.id,
          sortOrder: i,
        });
      }
      invalidate();
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not pin the current rail.");
      invalidate();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePinAutomaticRail = async () => {
    const ordered = draftAutomatic.length ? draftAutomatic : automaticRailMovies;
    await pinMoviesInOrder(
      ordered,
      `Pinned ${ordered.length} ${selectedGenre} titles — drag to reorder anytime.`,
    );
  };

  const handleReorderAutomatic = async (next: ApiContent[]) => {
    setDraftAutomatic(next);
    // Reordering the live automatic rail pins it so the website keeps this order.
    await pinMoviesInOrder(
      next,
      `Order saved for ${selectedGenre} — this rail is now curated.`,
    );
  };

  const handleRemove = async (item: ApiGenreRailItem) => {
    const label = item.content_title ?? "this movie";
    if (!window.confirm(`Remove "${label}" from the ${selectedGenre} rail?`)) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteAdminGenreRail(item.id);
      invalidate();
      toast.success("Removed from genre rail.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the movie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorder = async (next: ApiGenreRailItem[]) => {
    const previous = items;
    const optimistic = next.map((item, index) => ({ ...item, sort_order: index }));
    queryClient.setQueryData(queryKeys.genreRails(selectedGenre), optimistic);
    setIsSaving(true);
    try {
      await persistReorderedSort(next, (id, sortOrder) =>
        updateAdminGenreRail(id, { sortOrder }),
      );
      toast.success("Order updated");
    } catch (err) {
      queryClient.setQueryData(queryKeys.genreRails(selectedGenre), previous);
      toast.error(err instanceof Error ? err.message : "Could not reorder.");
    } finally {
      setIsSaving(false);
      invalidate();
    }
  };

  return (
    <>
      <AdminCard
        title={`Genre rails · ${items.length}/${MAX_PICKS}`}
        headerAction={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AdminSelect
              value={selectedGenre}
              onChange={setSelectedGenre}
              options={genreOptions}
              className={`${adminInputClass} min-w-[9.5rem] py-2`}
              aria-label="Genre rail"
            />
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              disabled={atLimit || !selectedGenre}
              title={atLimit ? "Limit reached — remove a movie first." : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 ${adminPrimaryButtonClass} disabled:opacity-40`}
            >
              <Plus size={14} strokeWidth={2.5} aria-hidden />
              Add movie
            </button>
          </div>
        }
      >

        {isLoading && !items.length ? (
          <InlineLoading label="Loading genre rail" />
        ) : error ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-xs text-warning">
            <div>{error}</div>
            {error.includes("genre_rail") ? (
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
          moviesLoading ? (
            <InlineLoading label={`Loading ${selectedGenre} titles`} />
          ) : moviesError ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-xs text-warning">
              {moviesError}
            </div>
          ) : draftAutomatic.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center">
              <p className="text-sm text-text-muted">
                No published movies tagged {selectedGenre} yet.
              </p>
              <p className="mt-1 text-xs text-text-disabled">
                Tag movies with this genre, or use &ldquo;Add movie&rdquo; to pick any title.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">
                    On the website now · {draftAutomatic.length} titles
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Drag to change order (saves to the site). Or pin as-is, then keep editing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handlePinAutomaticRail()}
                  disabled={isSaving}
                  className={`${adminPrimaryButtonClass} disabled:opacity-40`}
                >
                  Pin these to rail
                </button>
              </div>
              <SortableList
                items={draftAutomatic}
                disabled={isSaving}
                onReorder={handleReorderAutomatic}
                renderItem={(movie, index) => (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-mono text-2xs font-semibold tabular-nums text-text-muted">
                        #{index + 1}
                      </span>
                      <h3 className="truncate text-sm font-bold text-text">{movie.title}</h3>
                      {movie.release_year != null ? (
                        <span className="shrink-0 text-xs text-text-disabled">
                          {movie.release_year}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              />
            </div>
          )
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
                  <h2 className="text-[17px] font-bold tracking-[-0.02em]">
                    Add to {selectedGenre}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    Pick the movie that should appear on this home genre rail.{" "}
                    {items.length}/{MAX_PICKS} picked.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  disabled={isSaving}
                  aria-label="Close"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg text-text-muted transition-all hover:border-border-hover hover:bg-surface-elevated hover:text-text"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M11 3L3 11M3 3l8 8"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
              <AdminCatalogSearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search movies by title, slug, or genre…"
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
                    const onGenre = (movie.genres ?? [])
                      .map((g) => g.toLowerCase())
                      .includes(selectedGenre.toLowerCase());
                    return (
                      <div
                        key={movie.id}
                        className={[
                          "flex w-full items-center gap-3 px-3.5 py-2.5",
                          idx > 0 ? "border-t border-border" : "",
                        ].join(" ")}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text">
                            {movie.title}
                          </span>
                          {(movie.genres ?? []).length > 0 ? (
                            <span className="mt-0.5 block truncate text-2xs text-text-muted">
                              {(movie.genres ?? []).join(", ")}
                            </span>
                          ) : null}
                        </div>
                        {onGenre ? (
                          <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-2xs font-bold text-brand">
                            {selectedGenre}
                          </span>
                        ) : null}
                        {!movie.is_published ? (
                          <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-2xs font-bold text-warning">
                            Draft
                          </span>
                        ) : null}
                        {listed ? (
                          <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-success">
                            On rail
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
