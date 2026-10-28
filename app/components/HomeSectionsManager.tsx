"use client";

import { Eye, EyeOff, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { AdminCatalogSearchBar } from "./AdminCatalogSearchBar";
import { AdminSelect } from "./AdminSelect";
import { Button } from "./ui/Button";
import { HeroFeaturedManager } from "./HeroFeaturedManager";
import { InlineLoading } from "./InlineLoading";
import { PromotionBannerManager } from "./PromotionBannerManager";
import { SortableList, persistReorderedSort } from "./SortableList";
import {
  createAdminHomeSection,
  createAdminHomeSectionItem,
  deleteAdminHomeSection,
  deleteAdminHomeSectionItem,
  getAdminHomeSection,
  listAdminHomeSections,
  listAdminTvChannels,
  listAllAdminMovies,
  listAllAdminSeries,
  reorderAdminHomeSections,
  updateAdminHomeSection,
  updateAdminHomeSectionItem,
  type ApiContent,
  type ApiHomeSection,
  type ApiHomeSectionItem,
  type ApiHomeSectionType,
  type ApiSeries,
  type ApiTvChannel,
} from "../lib/api";
import { useGenres } from "../hooks/adminQueries";
import { GENRE_OPTIONS } from "../lib/genres";
import {
  adminDeleteButtonClassWide,
  adminInputClass,
  adminPrimaryButtonClass,
} from "../lib/adminUi";
import { queryKeys } from "../lib/queryKeys";

const TYPE_LABELS: Record<string, string> = {
  hero: "Hero carousel",
  banners: "Promo banners",
  tv: "Live TV",
  free_today: "Free movies today",
  trending: "Trending now",
  most_watched: "Most watched",
  coming_soon: "Coming soon",
  series: "Series",
  genre: "Genre rail",
  custom: "Custom rail",
  plans: "Plans",
};

const ADDABLE_TYPES: { value: ApiHomeSectionType; label: string }[] = [
  { value: "genre", label: "Genre rail" },
  { value: "custom", label: "Custom rail" },
  { value: "trending", label: "Trending now" },
  { value: "most_watched", label: "Most watched" },
  { value: "series", label: "Series" },
  { value: "tv", label: "Live TV" },
  { value: "free_today", label: "Free movies today" },
  { value: "coming_soon", label: "Coming soon" },
  { value: "hero", label: "Hero carousel" },
  { value: "banners", label: "Promo banners" },
  { value: "plans", label: "Plans" },
];

function sectionLabel(section: ApiHomeSection): string {
  if (section.title?.trim()) return section.title.trim();
  if (section.type === "genre" && section.genre_name) return section.genre_name;
  return TYPE_LABELS[section.type] ?? section.type;
}

function itemKindForSection(type: string): string | null {
  if (type === "tv") return "tv_channel";
  if (type === "series") return "series";
  if (type === "custom") return "movie";
  if (["free_today", "trending", "most_watched", "coming_soon", "genre"].includes(type)) {
    return "movie";
  }
  return null;
}

export function HomeSectionsManager() {
  const queryClient = useQueryClient();
  const { data: genreRows } = useGenres();

  const sectionsQuery = useQuery({
    queryKey: queryKeys.homeSections,
    queryFn: listAdminHomeSections,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newType, setNewType] = useState<ApiHomeSectionType>("custom");
  const [newTitle, setNewTitle] = useState("");
  const [newGenre, setNewGenre] = useState("Horror");
  const [titleDraft, setTitleDraft] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [movies, setMovies] = useState<ApiContent[]>([]);
  const [seriesList, setSeriesList] = useState<ApiSeries[]>([]);
  const [channels, setChannels] = useState<ApiTvChannel[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const sections = useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data]);

  const detailQuery = useQuery({
    queryKey: queryKeys.homeSection(selectedId ?? ""),
    queryFn: () => getAdminHomeSection(selectedId!),
    enabled: Boolean(selectedId),
  });

  const selected = detailQuery.data ?? null;
  const items = selected?.items ?? [];

  const genreOptions = useMemo(() => {
    const fromApi = (genreRows ?? []).map((g) => g.name).filter(Boolean);
    const merged = [...new Set([...GENRE_OPTIONS, ...fromApi])].sort((a, b) =>
      a.localeCompare(b),
    );
    return merged.map((name) => ({ value: name, label: name }));
  }, [genreRows]);

  useEffect(() => {
    if (!selectedId && sections.length) {
      setSelectedId(sections[0]!.id);
    }
  }, [sections, selectedId]);

  useEffect(() => {
    setTitleDraft(selected?.title ?? "");
  }, [selected?.id, selected?.title]);

  useEffect(() => {
    if (!showPicker) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) setShowPicker(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [showPicker, isSaving]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.homeSections });
    if (selectedId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.homeSection(selectedId) });
    }
  };

  const handleReorderSections = async (next: ApiHomeSection[]) => {
    const previous = sections;
    queryClient.setQueryData(queryKeys.homeSections, next);
    setIsSaving(true);
    try {
      await reorderAdminHomeSections(next.map((s) => s.id));
      toast.success("Section order updated");
    } catch (err) {
      queryClient.setQueryData(queryKeys.homeSections, previous);
      toast.error(err instanceof Error ? err.message : "Could not reorder sections.");
    } finally {
      setIsSaving(false);
      invalidate();
    }
  };

  const handleToggleVisible = async (section: ApiHomeSection) => {
    setIsSaving(true);
    try {
      await updateAdminHomeSection(section.id, { isVisible: !section.is_visible });
      toast.success(section.is_visible ? "Hidden on home" : "Visible on home");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update visibility.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await updateAdminHomeSection(selected.id, { title: titleDraft.trim() || null });
      toast.success("Title saved");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save title.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSection = async () => {
    setIsSaving(true);
    try {
      const created = await createAdminHomeSection({
        type: newType,
        title: newType === "custom" ? newTitle.trim() : null,
        genreName: newType === "genre" ? newGenre : null,
        sortOrder: sections.length,
      });
      setShowAddSection(false);
      setNewTitle("");
      setSelectedId(created.id);
      invalidate();
      toast.success("Section created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create section.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSection = async (section: ApiHomeSection) => {
    if (!["genre", "custom"].includes(section.type)) {
      toast.error("Hide this section instead of deleting it.");
      return;
    }
    if (!window.confirm(`Delete “${sectionLabel(section)}”?`)) return;
    setIsSaving(true);
    try {
      await deleteAdminHomeSection(section.id);
      if (selectedId === section.id) setSelectedId(null);
      invalidate();
      toast.success("Section deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete section.");
    } finally {
      setIsSaving(false);
    }
  };

  const openPicker = async () => {
    setShowPicker(true);
    setCatalogLoading(true);
    try {
      const kind = selected ? itemKindForSection(selected.type) : null;
      if (kind === "tv_channel") {
        const page = await listAdminTvChannels({ page: 1, pageSize: 100 });
        setChannels(page.items ?? []);
      } else if (kind === "series" || selected?.type === "custom") {
        const [m, s] = await Promise.all([listAllAdminMovies(), listAllAdminSeries()]);
        setMovies(m);
        setSeriesList(s);
      } else {
        setMovies(await listAllAdminMovies());
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load catalog.");
      setShowPicker(false);
    } finally {
      setCatalogLoading(false);
    }
  };

  const listedIds = useMemo(() => new Set(items.map((i) => i.ref_id)), [items]);

  const handleAddMovie = async (movie: ApiContent) => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await createAdminHomeSectionItem(selected.id, {
        itemKind: "movie",
        refId: movie.id,
        sortOrder: items.length,
      });
      toast.success(`Added “${movie.title}”`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add movie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSeries = async (series: ApiSeries) => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await createAdminHomeSectionItem(selected.id, {
        itemKind: "series",
        refId: series.id,
        sortOrder: items.length,
      });
      toast.success(`Added “${series.title}”`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add series.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddChannel = async (channel: ApiTvChannel) => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await createAdminHomeSectionItem(selected.id, {
        itemKind: "tv_channel",
        refId: channel.id,
        sortOrder: items.length,
      });
      toast.success(`Added “${channel.name}”`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add channel.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = async (item: ApiHomeSectionItem) => {
    if (!window.confirm(`Remove “${item.label ?? "this item"}” from the rail?`)) return;
    setIsSaving(true);
    try {
      await deleteAdminHomeSectionItem(item.id);
      toast.success("Removed");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorderItems = async (next: ApiHomeSectionItem[]) => {
    if (!selected) return;
    const previous = items;
    queryClient.setQueryData(queryKeys.homeSection(selected.id), {
      ...selected,
      items: next.map((item, index) => ({ ...item, sort_order: index })),
    });
    setIsSaving(true);
    try {
      await persistReorderedSort(next, (id, sortOrder) =>
        updateAdminHomeSectionItem(id, { sortOrder }),
      );
      toast.success("Order updated");
    } catch (err) {
      queryClient.setQueryData(queryKeys.homeSection(selected.id), {
        ...selected,
        items: previous,
      });
      toast.error(err instanceof Error ? err.message : "Could not reorder.");
    } finally {
      setIsSaving(false);
      invalidate();
    }
  };

  const filteredMovies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movies.filter(
      (m) =>
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q),
    );
  }, [movies, search]);

  const filteredSeries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return seriesList.filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q),
    );
  }, [seriesList, search]);

  const filteredChannels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [channels, search]);

  const existingTypes = useMemo(() => new Set(sections.map((s) => s.type)), [sections]);
  const addTypeOptions = ADDABLE_TYPES.filter(
    (t) => t.value === "genre" || t.value === "custom" || !existingTypes.has(t.value),
  ).map((t) => ({ value: t.value, label: t.label }));

  const pickable = selected ? itemKindForSection(selected.type) : null;
  const usesEmbeddedHero = selected?.type === "hero";
  const usesEmbeddedBanners = selected?.type === "banners";
  const isPlans = selected?.type === "plans";

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <AdminCard
          title={`Landing sections · ${sections.length}`}
          headerAction={
            <button
              type="button"
              onClick={() => setShowAddSection(true)}
              className={`inline-flex items-center gap-1.5 ${adminPrimaryButtonClass}`}
            >
              <Plus size={14} strokeWidth={2.5} aria-hidden />
              Add section
            </button>
          }
        >
          {sectionsQuery.isLoading ? (
            <InlineLoading label="Loading sections" />
          ) : sectionsQuery.error ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-xs text-warning">
              {sectionsQuery.error instanceof Error
                ? sectionsQuery.error.message
                : "Could not load sections."}
              <p className="mt-2 text-2xs">
                Run: cd movie-api && alembic upgrade head
              </p>
            </div>
          ) : sections.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              No sections yet. Add one or run the API migration.
            </p>
          ) : (
            <SortableList
              items={sections}
              disabled={isSaving}
              onReorder={handleReorderSections}
              renderItem={(section) => (
                <div className="flex w-full items-center gap-2">
                  <button
                    type="button"
                    data-no-drag
                    onClick={() => setSelectedId(section.id)}
                    className={[
                      "min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left transition-colors",
                      selectedId === section.id
                        ? "bg-brand/15 text-text"
                        : "hover:bg-surface-elevated",
                    ].join(" ")}
                  >
                    <div className="truncate text-sm font-semibold">{sectionLabel(section)}</div>
                    <div className="mt-0.5 text-2xs text-text-muted">
                      {TYPE_LABELS[section.type] ?? section.type}
                      {" · "}
                      {section.item_count} items
                      {!section.is_visible ? " · hidden" : ""}
                    </div>
                  </button>
                  <button
                    type="button"
                    data-no-drag
                    title={section.is_visible ? "Hide" : "Show"}
                    onClick={() => void handleToggleVisible(section)}
                    disabled={isSaving}
                    className="rounded-lg border border-border p-1.5 text-text-muted hover:bg-surface-elevated hover:text-text"
                  >
                    {section.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              )}
            />
          )}
        </AdminCard>

        <AdminCard
          title={selected ? sectionLabel(selected) : "Section"}
          headerAction={
            selected && ["genre", "custom"].includes(selected.type) ? (
              <button
                type="button"
                onClick={() => void handleDeleteSection(selected)}
                disabled={isSaving}
                className={adminDeleteButtonClassWide}
              >
                Delete
              </button>
            ) : null
          }
        >
          {!selectedId ? (
            <p className="py-8 text-center text-sm text-text-muted">Select a section</p>
          ) : detailQuery.isLoading ? (
            <InlineLoading label="Loading section" />
          ) : !selected ? (
            <p className="text-sm text-warning">Section not found</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[12rem] flex-1 text-xs text-text-muted">
                  Display title
                  <input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    placeholder={TYPE_LABELS[selected.type] ?? "Default website label"}
                    className={`mt-1 w-full ${adminInputClass}`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleSaveTitle()}
                  disabled={isSaving}
                  className={adminPrimaryButtonClass}
                >
                  Save title
                </button>
              </div>

              {selected.type === "genre" ? (
                <p className="text-xs text-text-muted">
                  Genre: <span className="font-semibold text-text">{selected.genre_name}</span>
                </p>
              ) : null}

              {usesEmbeddedHero ? (
                <HeroFeaturedManager />
              ) : usesEmbeddedBanners ? (
                <PromotionBannerManager />
              ) : isPlans ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                  Plans section has no items — toggle visibility and drag to reorder only.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-text-muted">
                      {items.length} items · drag to reorder
                    </p>
                    {pickable ? (
                      <button
                        type="button"
                        onClick={() => void openPicker()}
                        className={`inline-flex items-center gap-1.5 ${adminPrimaryButtonClass}`}
                      >
                        <Plus size={14} strokeWidth={2.5} aria-hidden />
                        Add
                      </button>
                    ) : null}
                  </div>
                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                      Empty — website may fall back to automatic content for this rail.
                    </p>
                  ) : (
                    <SortableList
                      items={items}
                      disabled={isSaving}
                      onReorder={handleReorderItems}
                      renderItem={(item, index) => (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-mono text-2xs font-semibold tabular-nums text-text-muted">
                              #{index + 1}
                            </span>
                            <h3 className="truncate text-sm font-bold text-text">
                              {item.label ?? item.ref_id}
                            </h3>
                            <span className="shrink-0 text-2xs text-text-disabled">
                              {item.item_kind}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRemoveItem(item)}
                            disabled={isSaving}
                            className={adminDeleteButtonClassWide}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </AdminCard>
      </div>

      {showAddSection ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <h2 className="text-[17px] font-bold">Add section</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-xs text-text-muted">
                Type
                <AdminSelect
                  value={newType}
                  onChange={(v) => setNewType(v as ApiHomeSectionType)}
                  options={addTypeOptions}
                  className={`mt-1 w-full ${adminInputClass}`}
                />
              </label>
              {newType === "custom" ? (
                <label className="block text-xs text-text-muted">
                  Title
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className={`mt-1 w-full ${adminInputClass}`}
                    placeholder="e.g. Editor’s picks"
                  />
                </label>
              ) : null}
              {newType === "genre" ? (
                <label className="block text-xs text-text-muted">
                  Genre
                  <AdminSelect
                    value={newGenre}
                    onChange={setNewGenre}
                    options={genreOptions}
                    className={`mt-1 w-full ${adminInputClass}`}
                  />
                </label>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAddSection(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreateSection()}
                disabled={
                  isSaving ||
                  (newType === "custom" && !newTitle.trim()) ||
                  (newType === "genre" && !newGenre)
                }
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showPicker && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6">
          <div className="flex h-[min(90vh,920px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <div className="border-b border-border px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[17px] font-bold">Add to {sectionLabel(selected)}</h2>
                  <p className="mt-1 text-xs text-text-muted">
                    Pick what appears on this home rail.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-surface-elevated hover:text-text"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
              <AdminCatalogSearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search…"
                resultCount={
                  selected.type === "tv"
                    ? filteredChannels.length
                    : selected.type === "series"
                      ? filteredSeries.length
                      : filteredMovies.length +
                        (selected.type === "custom" ? filteredSeries.length : 0)
                }
                totalCount={
                  selected.type === "tv"
                    ? channels.length
                    : selected.type === "series"
                      ? seriesList.length
                      : movies.length
                }
              />
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
                {catalogLoading ? (
                  <p className="py-6 text-center text-xs text-text-muted">Loading…</p>
                ) : selected.type === "tv" ? (
                  filteredChannels.map((channel, idx) => (
                    <div
                      key={channel.id}
                      className={[
                        "flex items-center gap-3 px-3.5 py-2.5",
                        idx > 0 ? "border-t border-border" : "",
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {channel.name}
                      </span>
                      {listedIds.has(channel.id) ? (
                        <span className="text-2xs font-bold uppercase text-success">On rail</span>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => void handleAddChannel(channel)}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  ))
                ) : selected.type === "series" ? (
                  filteredSeries.map((series, idx) => (
                    <div
                      key={series.id}
                      className={[
                        "flex items-center gap-3 px-3.5 py-2.5",
                        idx > 0 ? "border-t border-border" : "",
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {series.title}
                      </span>
                      {listedIds.has(series.id) ? (
                        <span className="text-2xs font-bold uppercase text-success">On rail</span>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => void handleAddSeries(series)}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    {filteredMovies.map((movie, idx) => (
                      <div
                        key={movie.id}
                        className={[
                          "flex items-center gap-3 px-3.5 py-2.5",
                          idx > 0 ? "border-t border-border" : "",
                        ].join(" ")}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {movie.title}
                        </span>
                        {listedIds.has(movie.id) ? (
                          <span className="text-2xs font-bold uppercase text-success">On rail</span>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={isSaving}
                            onClick={() => void handleAddMovie(movie)}
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    ))}
                    {selected.type === "custom"
                      ? filteredSeries.map((series) => (
                          <div
                            key={`s-${series.id}`}
                            className="flex items-center gap-3 border-t border-border px-3.5 py-2.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {series.title}{" "}
                              <span className="text-2xs text-text-muted">series</span>
                            </span>
                            {listedIds.has(series.id) ? (
                              <span className="text-2xs font-bold uppercase text-success">
                                On rail
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={isSaving}
                                onClick={() => void handleAddSeries(series)}
                              >
                                Add
                              </Button>
                            )}
                          </div>
                        ))
                      : null}
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end border-t border-border px-6 py-4">
              <Button type="button" variant="secondary" onClick={() => setShowPicker(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
