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
import { Button } from "./ui/Button";
import { adminBadgeClass } from "../lib/adminUi";
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
  videoEnabled: boolean;
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
  videoEnabled: true,
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

  // Progressive disclosure: hide the video override and schedule until needed.
  const [showVideoOverride, setShowVideoOverride] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const openCreateForm = () => {
    setEditingItem(null);
    setForm({ ...emptyForm(), sortOrder: String(items.length) });
    setCatalogSearch("");
    setTypeFilter("all");
    setShowVideoOverride(false);
    setShowSchedule(false);
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
      videoEnabled: item.video_enabled ?? true,
    });
    setCatalogSearch("");
    setTypeFilter(item.content_type === "custom" ? "all" : item.content_type);
    setShowVideoOverride(Boolean(item.video_key || item.youtube_url));
    setShowSchedule(Boolean(item.starts_at || item.ends_at));
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
        videoEnabled: isCustom ? true : (form.videoEnabled ?? true),
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
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={openCreateForm}
            icon={<Plus size={14} strokeWidth={2.5} aria-hidden />}
          >
            Add slide
          </Button>
        }
      >
        <p className="mb-4 text-sm leading-relaxed text-text-muted">
          The big carousel at the top of the client home page. Feature a{" "}
          <strong className="font-semibold text-text">movie or series</strong> — its trailer plays
          automatically — or add a <strong className="font-semibold text-text">video-only</strong>{" "}
          slide. Lower order shows first; only published titles appear to visitors.
        </p>

        {catalogLoading ? (
          <p className="mb-4 text-xs text-text-muted">Loading catalog…</p>
        ) : catalogError ? (
          <p className="mb-4 text-xs text-warning">{catalogError}</p>
        ) : (
          <p className="mb-4 text-xs text-text-muted">
            Catalog ready: {movies.length} movies · {seriesList.length} series
          </p>
        )}

        {isLoading && !items.length ? (
          <InlineLoading label="Loading hero slides" />
        ) : error ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-xs text-warning">
            <div>{error}</div>
            {error.includes("hero_featured_items") ? (
              <p className="mt-2 text-2xs">Run: cd movie-api && alembic upgrade head</p>
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
            <p className="text-sm text-text-muted">No hero slides yet.</p>
            <p className="mt-1 text-xs text-text-disabled">
              Click &ldquo;Add slide&rdquo; — feature a movie or series, or add a video-only slide.
            </p>
            <Button type="button" className="mt-4" onClick={openCreateForm}>
              Add slide
            </Button>
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
                        {item.content_title ??
                          (item.content_type === "custom" ? "Custom video" : "Unknown title")}
                      </h3>
                      <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-text-muted">
                        {item.content_type === "custom" ? "video only" : item.content_type}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                          item.is_active
                            ? "bg-success/15 text-success"
                            : "bg-text-disabled/25 text-text-muted"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                      {(item.video_key || item.youtube_url) ? (
                        <span className={adminBadgeClass("brand")}>Video</span>
                      ) : null}
                      {item.content_type !== "custom" && item.video_enabled === false ? (
                        <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-text-muted">
                          Banner only
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-2xs text-text-muted">
                      Order {item.sort_order}
                      {item.content_slug ? ` · ${item.content_slug}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditForm(item)}
                      disabled={isSaving}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger-soft"
                      size="sm"
                      onClick={() => void handleDelete(item)}
                      disabled={isSaving}
                    >
                      Remove
                    </Button>
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
                    {editingItem ? "Edit hero slide" : "Add hero slide"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    What plays in the big carousel at the top of the client home page.
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        [
                          "catalog",
                          "Movie or series",
                          "Feature a title from your catalog. Its trailer plays automatically.",
                        ],
                        [
                          "custom",
                          "Video only",
                          "Just a video — upload a file or paste a YouTube link.",
                        ],
                      ] as const
                    ).map(([mode, label, hint]) => {
                      const isActive = form.slideMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, slideMode: mode }))}
                          className={[
                            "rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer",
                            isActive
                              ? "border-brand bg-brand/5 ring-1 ring-brand/40"
                              : "border-border bg-bg hover:border-border-hover hover:bg-surface-elevated",
                          ].join(" ")}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={[
                                "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                                isActive ? "border-brand" : "border-border",
                              ].join(" ")}
                            >
                              {isActive ? (
                                <span className="size-2 rounded-full bg-brand" />
                              ) : null}
                            </span>
                            <span
                              className={`text-sm font-bold ${isActive ? "text-text" : "text-text-muted"}`}
                            >
                              {label}
                            </span>
                          </span>
                          <span className="mt-1.5 block pl-6 text-2xs leading-relaxed text-text-muted">
                            {hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.slideMode === "catalog" ? (
                <>
                {/* ── Section: Select Content ── */}
                <div className="px-6 py-5">
                  <div className="mb-4 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-text-muted">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Pick the title
                  </div>

                  {/* Selected entry preview */}
                  {selectedEntry ? (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-brand/25 bg-gradient-to-r from-brand/[0.04] to-transparent p-3.5">
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-sm">
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
                        <p className="truncate text-sm font-bold">{selectedEntry.title}</p>
                        <p className="text-2xs text-text-muted">
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
                      <p className="text-xs font-semibold text-text-muted">
                        No title selected
                      </p>
                      <p className="mt-0.5 text-2xs text-text-disabled">
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
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
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
                      <p className="py-6 text-center text-xs text-text-muted">
                        Loading catalog…
                      </p>
                    ) : catalogError ? (
                      <p className="py-6 text-center text-xs text-warning">
                        {catalogError}
                      </p>
                    ) : filteredCatalog.length === 0 ? (
                      <p className="py-6 text-center text-xs text-text-muted">
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
                            {/* Type is a neutral chip; colour is reserved for status + brand. */}
                            <span className={`shrink-0 ${adminBadgeClass("muted")}`}>
                              {entry.contentType === "movie" ? "Movie" : "Series"}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                              {entry.title}
                            </span>
                            {!entry.isPublished ? (
                              <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-2xs font-bold text-warning">
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

                {/* ── Section: Video (catalog) ── */}
                <div className="border-t border-border px-6 py-5">
                  <div className="mb-3 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-text-muted">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5A1.5 1.5 0 014 2h6a1.5 1.5 0 011.5 1.5v7A1.5 1.5 0 0110 12H4a1.5 1.5 0 01-1.5-1.5v-7z" stroke="currentColor" strokeWidth="1.3"/><path d="M6 5.5l2.5 1.5L6 8.5v-3z" fill="currentColor"/></svg>
                    Video
                  </div>
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={form.videoEnabled ?? true}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          videoEnabled: enabled,
                          ...(enabled ? {} : { videoKey: "", youtubeUrl: "" }),
                        }));
                        if (!enabled) setShowVideoOverride(false);
                      }}
                      disabled={isSaving || mediaUploading}
                      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-text">
                        Play a video on this slide
                      </span>
                      <span className="mt-0.5 block text-2xs text-text-muted">
                        {form.videoEnabled
                          ? "The title's trailer plays automatically."
                          : "Just the banner image — no video."}
                      </span>
                    </span>
                  </label>

                  {form.videoEnabled ? (
                    <div className="mt-3 pl-6.5">
                      {showVideoOverride ? (
                        <div className="space-y-3">
                          <HeroVideoField
                            videoKey={form.videoKey}
                            youtubeUrl={form.youtubeUrl}
                            onVideoKeyChange={(key) => setForm((prev) => ({ ...prev, videoKey: key }))}
                            onYoutubeUrlChange={(url) => setForm((prev) => ({ ...prev, youtubeUrl: url }))}
                            disabled={isSaving}
                            onUploadingChange={setMediaUploading}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowVideoOverride(false);
                              setForm((prev) => ({ ...prev, videoKey: "", youtubeUrl: "" }));
                            }}
                            disabled={isSaving || mediaUploading}
                            className="cursor-pointer text-2xs font-semibold text-text-muted transition-colors hover:text-text"
                          >
                            Never mind — just use the trailer
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowVideoOverride(true)}
                          className="cursor-pointer text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
                        >
                          Use a different video
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
                </>
                ) : (
                <div className="px-6 py-5 space-y-5">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-text-muted">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5A1.5 1.5 0 014 2h6a1.5 1.5 0 011.5 1.5v7A1.5 1.5 0 0110 12H4a1.5 1.5 0 01-1.5-1.5v-7z" stroke="currentColor" strokeWidth="1.3"/><path d="M6 5.5l2.5 1.5L6 8.5v-3z" fill="currentColor"/></svg>
                      The video
                    </div>
                    <HeroVideoField
                      videoKey={form.videoKey}
                      youtubeUrl={form.youtubeUrl}
                      onVideoKeyChange={(key) => setForm((prev) => ({ ...prev, videoKey: key }))}
                      onYoutubeUrlChange={(url) => setForm((prev) => ({ ...prev, youtubeUrl: url }))}
                      disabled={isSaving}
                      onUploadingChange={setMediaUploading}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-2xs font-semibold text-text-muted">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Shown in big text over the video"
                      className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                    />
                    <p className="mt-1 text-2xs text-text-disabled">
                      Leave empty to show just the video.
                    </p>
                  </div>
                </div>
                )}

                {/* ── Section: Display Settings ── */}
                <div className="border-t border-border px-6 py-5 space-y-4">
                  <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-text-muted">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Display
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-2xs font-semibold text-text-muted">
                        Order
                      </label>
                      <input
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                      />
                      <p className="mt-1 text-2xs text-text-disabled">Lower shows first.</p>
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
                        <span className="text-xs font-semibold text-text">
                          {form.isActive ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {showSchedule ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-2xs font-semibold text-text-muted">
                            <span className="flex items-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v2M6 9v2M1 6h2M9 6h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                              Starts at
                            </span>
                          </label>
                          <input
                            type="datetime-local"
                            value={form.startsAt}
                            onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-2xs font-semibold text-text-muted">
                            <span className="flex items-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v2M6 9v2M1 6h2M9 6h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                              Ends at
                            </span>
                          </label>
                          <input
                            type="datetime-local"
                            value={form.endsAt}
                            onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-2xs text-text-disabled">
                          Leave empty to show anytime while active.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSchedule(false);
                            setForm((prev) => ({ ...prev, startsAt: "", endsAt: "" }));
                          }}
                          className="cursor-pointer text-2xs font-semibold text-text-muted transition-colors hover:text-text"
                        >
                          Remove schedule
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSchedule(true)}
                      className="cursor-pointer text-xs font-semibold text-text-muted transition-colors hover:text-text"
                    >
                      + Schedule start and end dates (optional)
                    </button>
                  )}
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/50 px-6 py-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeForm}
                  disabled={isSaving || mediaUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isSaving}
                  disabled={
                    isSaving ||
                    mediaUploading ||
                    (form.slideMode === "catalog"
                      ? !form.contentId
                      : !form.videoKey && !form.youtubeUrl.trim())
                  }
                >
                  {isSaving ? "Saving…" : editingItem ? "Save changes" : "Add to hero"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
