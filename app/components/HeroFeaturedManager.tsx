"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { AdminCatalogSearchBar } from "./AdminCatalogSearchBar";
import { InlineLoading } from "./InlineLoading";
import {
  createAdminHeroFeatured,
  deleteAdminHeroFeatured,
  listAdminHeroFeatured,
  listAllAdminMovies,
  listAllAdminSeries,
  updateAdminHeroFeatured,
  type ApiContent,
  type ApiHeroFeaturedItem,
  type ApiSeries,
} from "../lib/api";
import { adminInputClass, adminPrimaryButtonClass } from "../lib/adminUi";
import { adminDeleteButtonClassWide } from "../lib/adminUi";
import { mediaUrl } from "../lib/media";
import { queryKeys } from "../lib/queryKeys";

type ContentType = "movie" | "series";
type TypeFilter = "all" | ContentType;

type CatalogEntry = {
  id: string;
  title: string;
  slug: string;
  contentType: ContentType;
  posterKey: string | null;
  isPublished: boolean;
};

type ItemFormState = {
  contentType: ContentType;
  contentId: string;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
};

const emptyForm = (): ItemFormState => ({
  contentType: "movie",
  contentId: "",
  isActive: true,
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
});

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildCatalog(movies: ApiContent[], seriesList: ApiSeries[]): CatalogEntry[] {
  const movieEntries: CatalogEntry[] = movies.map((m) => ({
    id: m.id,
    title: m.title,
    slug: m.slug,
    contentType: "movie",
    posterKey: m.poster_key,
    isPublished: m.is_published,
  }));
  const seriesEntries: CatalogEntry[] = seriesList.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    contentType: "series",
    posterKey: s.poster_key,
    isPublished: s.is_published,
  }));
  return [...movieEntries, ...seriesEntries].sort((a, b) => a.title.localeCompare(b.title));
}

export function HeroFeaturedManager() {
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({
    queryKey: queryKeys.heroFeatured,
    queryFn: listAdminHeroFeatured,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ApiHeroFeaturedItem | null>(null);
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [movies, setMovies] = useState<ApiContent[]>([]);
  const [seriesList, setSeriesList] = useState<ApiSeries[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const items = itemsQuery.data ?? [];
  const isLoading = itemsQuery.isLoading;
  const error = itemsQuery.error
    ? itemsQuery.error instanceof Error
      ? itemsQuery.error.message
      : "Could not load hero featured items."
    : null;

  const catalog = useMemo(() => buildCatalog(movies, seriesList), [movies, seriesList]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return catalog.filter((entry) => {
      if (typeFilter !== "all" && entry.contentType !== typeFilter) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.slug.toLowerCase().includes(q)
      );
    });
  }, [catalog, catalogSearch, typeFilter]);

  const selectedEntry = useMemo(
    () => catalog.find((e) => e.id === form.contentId) ?? null,
    [catalog, form.contentId],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.heroFeatured });
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAllAdminMovies(), listAllAdminSeries()])
      .then(([movieRows, seriesRows]) => {
        if (cancelled) return;
        setMovies(movieRows);
        setSeriesList(seriesRows);
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : "Could not load catalog.");
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) closeForm();
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showForm, isSaving]);

  const openCreateForm = () => {
    setEditingItem(null);
    setForm({ ...emptyForm(), sortOrder: String(items.length) });
    setCatalogSearch("");
    setTypeFilter("all");
    setShowForm(true);
  };

  const openEditForm = (item: ApiHeroFeaturedItem) => {
    setEditingItem(item);
    setForm({
      contentType: item.content_type,
      contentId: item.content_id,
      isActive: item.is_active,
      sortOrder: String(item.sort_order),
      startsAt: toDatetimeLocalValue(item.starts_at),
      endsAt: toDatetimeLocalValue(item.ends_at),
    });
    setCatalogSearch("");
    setTypeFilter(item.content_type);
    setShowForm(true);
  };

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setForm(emptyForm());
    setCatalogSearch("");
    setTypeFilter("all");
  }

  const selectEntry = (entry: CatalogEntry) => {
    setForm((prev) => ({
      ...prev,
      contentId: entry.id,
      contentType: entry.contentType,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.contentId) {
      toast.error("Pick a movie or series from the catalog below.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        contentType: form.contentType,
        contentId: form.contentId,
        placement: "home",
        isActive: form.isActive,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        startsAt: fromDatetimeLocalValue(form.startsAt),
        endsAt: fromDatetimeLocalValue(form.endsAt),
      };

      if (editingItem) {
        await updateAdminHeroFeatured(editingItem.id, payload);
        toast.success("Hero slide updated.");
      } else {
        await createAdminHeroFeatured(payload);
        toast.success("Added to home hero.");
      }

      invalidate();
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save hero slide.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ApiHeroFeaturedItem) => {
    const label = item.content_title ?? item.content_id;
    if (!window.confirm(`Remove "${label}" from the home hero?`)) return;
    setIsSaving(true);
    try {
      await deleteAdminHeroFeatured(item.id);
      invalidate();
      toast.success("Removed from home hero.");
      if (editingItem?.id === item.id) closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove hero slide.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AdminCard title="Home hero carousel" action="Add movie or series" actionOnClick={openCreateForm}>
        <p className="mb-4 text-[13px] leading-relaxed text-text-muted">
          Pick titles from your <strong className="font-semibold text-text">Movies</strong> and{" "}
          <strong className="font-semibold text-text">Series</strong> catalog for the big carousel
          at the top of the client home page. Lower sort order shows first. Only{" "}
          <strong className="font-semibold text-text">published</strong> titles appear to visitors.
        </p>

        {catalogLoading ? (
          <p className="mb-4 text-[12px] text-text-muted">Loading catalog…</p>
        ) : catalogError ? (
          <p className="mb-4 text-[12px] text-warning">{catalogError}</p>
        ) : (
          <p className="mb-4 text-[12px] text-text-muted">
            Catalog ready: {movies.length} movies · {seriesList.length} series
          </p>
        )}

        {isLoading && !items.length ? (
          <InlineLoading label="Loading hero slides" />
        ) : error ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
            <div>{error}</div>
            {error.includes("hero_featured_items") ? (
              <p className="mt-2 text-[11px]">Run: cd movie-api && alembic upgrade head</p>
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
          <div className="rounded-md border border-dashed border-border py-8 text-center">
            <p className="text-[13px] text-text-muted">No hero slides yet.</p>
            <p className="mt-1 text-[12px] text-text-disabled">
              Click &ldquo;Add movie or series&rdquo; and pick from your catalog. Until then, the
              home page shows the newest movies and series automatically.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className={`mt-4 ${adminPrimaryButtonClass}`}
            >
              Pick from catalog
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const thumb = mediaUrl(item.poster_key);
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-bg p-4"
                >
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-sm border border-border bg-surface-elevated">
                    {thumb ? (
                      <Image src={thumb} alt="" fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-text-disabled">
                        No poster
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-bold">
                        {item.content_title ?? "Unknown title"}
                      </h3>
                      <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        {item.content_type}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.is_active
                            ? "bg-success/15 text-success"
                            : "bg-text-disabled/25 text-text-muted"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-text-muted">
                      Sort {item.sort_order}
                      {item.content_slug ? ` · ${item.content_slug}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      disabled={isSaving}
                      className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
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

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-none">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-[16px] font-bold">
                {editingItem ? "Edit hero slide" : "Add movie or series to home hero"}
              </h2>
              <p className="mt-1 text-[12px] text-text-muted">
                Click a poster below to choose from your Movies or Series catalog.
              </p>
            </div>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                {selectedEntry ? (
                  <div className="mb-4 flex items-center gap-3 rounded-md border border-brand/30 bg-brand/5 p-3">
                    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-sm border border-border bg-surface-elevated">
                      {mediaUrl(selectedEntry.posterKey) ? (
                        <Image
                          src={mediaUrl(selectedEntry.posterKey)!}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">{selectedEntry.title}</p>
                      <p className="text-[11px] text-text-muted">
                        {selectedEntry.contentType === "movie" ? "Movie" : "Series"}
                        {!selectedEntry.isPublished ? " · Draft (won’t show until published)" : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 rounded-md border border-dashed border-border px-4 py-3 text-[12px] text-text-muted">
                    No title selected — pick one from the grid below.
                  </div>
                )}

                <div className="mb-3 flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "All"],
                      ["movie", "Movies"],
                      ["series", "Series"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTypeFilter(key)}
                      className={[
                        "rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                        typeFilter === key
                          ? "border-brand bg-brand text-white"
                          : "border-border bg-bg text-text-muted hover:text-text",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <AdminCatalogSearchBar
                  value={catalogSearch}
                  onChange={setCatalogSearch}
                  placeholder="Search movies and series by title or slug…"
                  resultCount={filteredCatalog.length}
                  totalCount={catalog.length}
                />

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {catalogLoading ? (
                    <p className="col-span-full py-6 text-center text-[12px] text-text-muted">
                      Loading catalog…
                    </p>
                  ) : catalogError ? (
                    <p className="col-span-full py-6 text-center text-[12px] text-warning">
                      {catalogError}
                    </p>
                  ) : filteredCatalog.length === 0 ? (
                    <p className="col-span-full py-6 text-center text-[12px] text-text-muted">
                      No titles match. Add movies under Movies or series under Series first.
                    </p>
                  ) : (
                    filteredCatalog.map((entry) => {
                      const thumb = mediaUrl(entry.posterKey);
                      const selected = form.contentId === entry.id;
                      return (
                        <button
                          key={`${entry.contentType}-${entry.id}`}
                          type="button"
                          onClick={() => selectEntry(entry)}
                          className={[
                            "overflow-hidden rounded-md border text-left transition-colors",
                            selected
                              ? "border-brand ring-2 ring-brand/30"
                              : "border-border hover:border-border-hover",
                          ].join(" ")}
                        >
                          <div className="relative aspect-[2/3] bg-surface-elevated">
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt={entry.title}
                                fill
                                className="object-cover"
                                sizes="120px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-text-disabled">
                                No poster
                              </div>
                            )}
                            <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                              {entry.contentType === "movie" ? "Movie" : "Series"}
                            </span>
                          </div>
                          <div className="p-2">
                            <p className="line-clamp-2 text-[11px] font-semibold leading-snug">
                              {entry.title}
                            </p>
                            {!entry.isPublished ? (
                              <p className="mt-0.5 text-[10px] text-warning">Draft</p>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Sort order
                    </label>
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                      className={adminInputClass}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
                      />
                      Active on home page
                    </label>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Starts (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                      className={adminInputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Ends (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                      className={adminInputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="rounded-md border border-border px-4 py-2 text-[12px] font-semibold text-text-muted hover:text-text disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !form.contentId}
                  className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : editingItem ? "Save changes" : "Add to hero"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
