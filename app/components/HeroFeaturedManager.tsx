"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { AdminCatalogSearchBar } from "./AdminCatalogSearchBar";
import { InlineLoading } from "./InlineLoading";
import { HeroVideoField } from "./HeroSlideMediaFields";
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
import { adminPrimaryButtonClass } from "../lib/adminUi";
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

type SlideMode = "catalog" | "custom";

type ItemFormState = {
  slideMode: SlideMode;
  contentType: ContentType;
  contentId: string;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
  title: string;
  description: string;
  bannerKey: string;
  linkUrl: string;
  videoKey: string;
  youtubeUrl: string;
};

const emptyForm = (): ItemFormState => ({
  slideMode: "catalog",
  contentType: "movie",
  contentId: "",
  isActive: true,
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
  title: "",
  description: "",
  bannerKey: "",
  linkUrl: "",
  videoKey: "",
  youtubeUrl: "",
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
  const [mediaUploading, setMediaUploading] = useState(false);
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
      if (event.key === "Escape" && !isSaving && !mediaUploading) closeForm();
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showForm, isSaving, mediaUploading]);

  const openCreateForm = () => {
    setEditingItem(null);
    setForm({ ...emptyForm(), sortOrder: String(items.length) });
    setCatalogSearch("");
    setTypeFilter("all");
    setShowForm(true);
  };

  const openEditForm = (item: ApiHeroFeaturedItem) => {
    setEditingItem(item);
    const isCustom = item.content_type === "custom";
    setForm({
      slideMode: isCustom ? "custom" : "catalog",
      contentType: item.content_type === "series" ? "series" : "movie",
      contentId: item.content_id ?? "",
      isActive: item.is_active,
      sortOrder: String(item.sort_order),
      startsAt: toDatetimeLocalValue(item.starts_at),
      endsAt: toDatetimeLocalValue(item.ends_at),
      title: item.title ?? "",
      description: item.description ?? "",
      bannerKey: item.banner_key ?? "",
      linkUrl: item.link_url ?? "",
      videoKey: item.video_key ?? "",
      youtubeUrl: item.youtube_url ?? "",
    });
    setCatalogSearch("");
    setTypeFilter(item.content_type === "custom" ? "all" : item.content_type);
    setShowForm(true);
  };

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setForm(emptyForm());
    setCatalogSearch("");
    setTypeFilter("all");
    setMediaUploading(false);
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
    const isCustom = form.slideMode === "custom";
    if (isCustom && !form.videoKey && !form.youtubeUrl.trim()) {
      toast.error("Upload a video file or paste a YouTube URL.");
      return;
    }
    if (!isCustom && !form.contentId) {
      toast.error("Pick a movie or series from the catalog below.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        contentType: isCustom ? ("custom" as const) : form.contentType,
        contentId: isCustom ? null : form.contentId,
        placement: "home",
        isActive: form.isActive,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        startsAt: fromDatetimeLocalValue(form.startsAt),
        endsAt: fromDatetimeLocalValue(form.endsAt),
        title: isCustom ? form.title.trim() || null : null,
        description: null,
        bannerKey: null,
        linkUrl: null,
        videoKey: form.videoKey || null,
        youtubeUrl: form.videoKey ? null : form.youtubeUrl.trim() || null,
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
    const label =
      item.content_title ??
      item.title ??
      (item.content_type === "custom" ? "Custom video" : item.content_id ?? "this slide");
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
      <AdminCard
        title="Home hero carousel"
        headerAction={
          <button
            type="button"
            onClick={openCreateForm}
            className={`inline-flex shrink-0 items-center gap-1.5 ${adminPrimaryButtonClass}`}
          >
            <Plus size={14} strokeWidth={2.5} aria-hidden />
            Add slide
          </button>
        }
      >
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
              Click &ldquo;Add slide&rdquo; and pick from your catalog or create a custom slide.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className={`mt-4 ${adminPrimaryButtonClass}`}
            >
              Add slide
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
                        {item.content_title ??
                          (item.content_type === "custom" ? "Custom video" : "Unknown title")}
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
                      {(item.video_key || item.youtube_url) ? (
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                          Video
                        </span>
                      ) : null}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_80px_-12px_rgba(0,0,0,0.18)]">
            {/* ── Header ── */}
            <div className="relative border-b border-border px-6 py-5">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand via-brand-hover to-brand/60" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[17px] font-bold tracking-[-0.02em]">
                    {editingItem ? "Edit hero slide" : "Add to home hero carousel"}
                  </h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
                    {form.slideMode === "catalog"
                      ? "Pick a title from your catalog to feature in the big carousel at the top of the client home page."
                      : "Add a video that plays in the big carousel at the top of the client home page."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving || mediaUploading}
                  aria-label="Close"
                  className="shrink-0 flex items-center justify-center size-8 rounded-lg border border-border bg-bg text-text-muted transition-all hover:border-border-hover hover:bg-surface-elevated hover:text-text"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                {/* ── Section: Slide type ── */}
                <div className="border-b border-border px-6 py-4">
                  <div className="flex gap-1.5">
                    {(
                      [
                        ["catalog", "From catalog"],
                        ["custom", "Custom slide"],
                      ] as const
                    ).map(([mode, label]) => {
                      const isActive = form.slideMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, slideMode: mode }))}
                          className={[
                            "rounded-lg border px-4 py-2 text-[12px] font-semibold transition-all duration-150",
                            isActive
                              ? "border-brand bg-brand text-white shadow-[0_1px_4px_rgba(229,9,20,0.25)]"
                              : "border-border bg-bg text-text-muted hover:border-border-hover hover:bg-surface-elevated hover:text-text",
                          ].join(" ")}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-text-disabled">
                    {form.slideMode === "catalog"
                      ? "Feature a movie or series from your catalog."
                      : "Create a standalone slide with its own text, banner, and link."}
                  </p>
                </div>

                {form.slideMode === "catalog" ? (
                <>
                {/* ── Section: Select Content ── */}
                <div className="px-6 py-5">
                  <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Select Content
                  </div>

                  {/* Selected entry preview */}
                  {selectedEntry ? (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-brand/25 bg-gradient-to-r from-brand/[0.04] to-transparent p-3.5">
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-surface-elevated shadow-sm">
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
                          {!selectedEntry.isPublished ? " · Draft (won't show until published)" : ""}
                        </p>
                      </div>
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4" stroke="var(--rt-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-4 py-6 text-center">
                      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-surface-elevated text-text-disabled">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      </div>
                      <p className="text-[12px] font-semibold text-text-muted">
                        No title selected
                      </p>
                      <p className="mt-0.5 text-[11px] text-text-disabled">
                        Pick one from the grid below
                      </p>
                    </div>
                  )}

                  {/* Filter chips */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", "All"],
                        ["movie", "Movies"],
                        ["series", "Series"],
                      ] as const
                    ).map(([key, label]) => {
                      const isActive = typeFilter === key;
                      const iconColor = isActive ? "white" : "currentColor";
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTypeFilter(key)}
                          className={[
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150",
                            isActive
                              ? "border-brand bg-brand text-white shadow-[0_1px_4px_rgba(229,9,20,0.25)]"
                              : "border-border bg-bg text-text-muted hover:border-border-hover hover:bg-surface-elevated hover:text-text",
                          ].join(" ")}
                        >
                          {key === "movie" ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="8" rx="1.5" stroke={iconColor} strokeWidth="1.3"/><path d="M5 3V11M9 3V11M2 5.5H5M9 5.5H12M2 8.5H5M9 8.5H12" stroke={iconColor} strokeWidth="1" strokeLinecap="round"/></svg>
                          ) : key === "series" ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="8" rx="1.5" stroke={iconColor} strokeWidth="1.3"/><path d="M4.5 12.5h5" stroke={iconColor} strokeWidth="1.3" strokeLinecap="round"/></svg>
                          ) : null}
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <AdminCatalogSearchBar
                    value={catalogSearch}
                    onChange={setCatalogSearch}
                    placeholder="Search movies and series by title or slug…"
                    resultCount={filteredCatalog.length}
                    totalCount={catalog.length}
                  />

                  <div className="mt-4 max-h-[280px] overflow-y-auto rounded-lg border border-border">
                    {catalogLoading ? (
                      <p className="py-6 text-center text-[12px] text-text-muted">
                        Loading catalog…
                      </p>
                    ) : catalogError ? (
                      <p className="py-6 text-center text-[12px] text-warning">
                        {catalogError}
                      </p>
                    ) : filteredCatalog.length === 0 ? (
                      <p className="py-6 text-center text-[12px] text-text-muted">
                        No titles match. Add movies under Movies or series under Series first.
                      </p>
                    ) : (
                      filteredCatalog.map((entry, idx) => {
                        const selected = form.contentId === entry.id;
                        return (
                          <button
                            key={`${entry.contentType}-${entry.id}`}
                            type="button"
                            onClick={() => selectEntry(entry)}
                            className={[
                              "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150",
                              idx > 0 ? "border-t border-border" : "",
                              selected
                                ? "bg-brand/[0.06]"
                                : "hover:bg-surface-elevated",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                entry.contentType === "movie"
                                  ? "bg-blue-500/10 text-blue-600"
                                  : "bg-violet-500/10 text-violet-600",
                              ].join(" ")}
                            >
                              {entry.contentType === "movie" ? "Movie" : "Series"}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
                              {entry.title}
                            </span>
                            {!entry.isPublished ? (
                              <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
                                Draft
                              </span>
                            ) : null}
                            {selected ? (
                              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand">
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5l2 2L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </div>
                            ) : (
                              <div className="size-5 shrink-0 rounded-full border-2 border-border" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
                </>
                ) : (
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
                    Custom slide
                  </div>
                  <p className="text-[12px] leading-relaxed text-text-muted">
                    A video with an optional movie title. Upload a file or paste a
                    YouTube link in the Hero Video section below.
                  </p>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-text-muted">
                      Movie title
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Shown over the video on the home page"
                      className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[13px] text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                    />
                  </div>
                </div>
                )}

                {/* ── Section: Hero video ── */}
                <div className="border-t border-border px-6 py-5">
                  <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5A1.5 1.5 0 014 2h6a1.5 1.5 0 011.5 1.5v7A1.5 1.5 0 0110 12H4a1.5 1.5 0 01-1.5-1.5v-7z" stroke="currentColor" strokeWidth="1.3"/><path d="M6 5.5l2.5 1.5L6 8.5v-3z" fill="currentColor"/></svg>
                    Hero Video
                  </div>
                  {form.slideMode === "catalog" ? (
                    <p className="mb-4 -mt-2 text-[11px] text-text-disabled">
                      Leave empty to automatically play the title&apos;s own trailer when it has one.
                    </p>
                  ) : null}
                  <HeroVideoField
                    videoKey={form.videoKey}
                    youtubeUrl={form.youtubeUrl}
                    onVideoKeyChange={(key) => setForm((prev) => ({ ...prev, videoKey: key }))}
                    onYoutubeUrlChange={(url) => setForm((prev) => ({ ...prev, youtubeUrl: url }))}
                    disabled={isSaving}
                    onUploadingChange={setMediaUploading}
                    required={form.slideMode === "custom"}
                  />
                </div>

                {/* ── Section: Display Settings ── */}
                <div className="border-t border-border px-6 py-5 space-y-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Display Settings
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-text-muted">
                        Sort order
                      </label>
                      <input
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[13px] text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.isActive}
                        onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                        className="group flex items-center gap-3"
                      >
                        <span
                          className={[
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                            form.isActive ? "bg-success" : "bg-text-disabled/30",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                              form.isActive ? "translate-x-5" : "translate-x-0",
                            ].join(" ")}
                          />
                        </span>
                        <span className="text-[12px] font-semibold text-text">
                          {form.isActive ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-text-muted">
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v2M6 9v2M1 6h2M9 6h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          Starts at
                        </span>
                      </label>
                      <input
                        type="datetime-local"
                        value={form.startsAt}
                        onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[13px] text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-text-muted">
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v2M6 9v2M1 6h2M9 6h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          Ends at
                        </span>
                      </label>
                      <input
                        type="datetime-local"
                        value={form.endsAt}
                        onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[13px] text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-text-disabled">
                    Leave schedule empty to show anytime while active.
                  </p>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/50 px-6 py-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving || mediaUploading}
                  className="rounded-lg border border-border bg-surface px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-all hover:border-border-hover hover:bg-surface-elevated hover:text-text disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    mediaUploading ||
                    (form.slideMode === "catalog"
                      ? !form.contentId
                      : !form.videoKey && !form.youtubeUrl.trim())
                  }
                  className="rounded-lg bg-brand px-5 py-2.5 text-[12px] font-bold text-white shadow-[0_1px_3px_rgba(229,9,20,0.3)] transition-all hover:bg-brand-hover hover:shadow-[0_2px_8px_rgba(229,9,20,0.4)] active:scale-[0.98] disabled:opacity-60 disabled:shadow-none"
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
