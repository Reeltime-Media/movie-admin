"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { AdminEmptyState } from "./AdminEmptyState";
import { AdminErrorAlert } from "./AdminErrorAlert";
import { AdminMediaThumb } from "./AdminMediaThumb";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Field";
import { HeroFeaturedManager } from "./HeroFeaturedManager";
import { HomeSectionAddDialog } from "./HomeSectionAddDialog";
import { HomeSectionOutline } from "./HomeSectionOutline";
import { HomeSectionPicker, type HomeSectionPickerRow } from "./HomeSectionPicker";
import { InlineLoading } from "./InlineLoading";
import { PromotionBannerManager } from "./PromotionBannerManager";
import { SortableList } from "./SortableList";
import {
  createAdminHomeSection,
  createAdminHomeSectionItem,
  deleteAdminHomeSection,
  deleteAdminHomeSectionItem,
  getAdminHomeSection,
  listAdminHomeSections,
  listAdminTvChannels,
  reorderAdminHomeSectionItems,
  reorderAdminHomeSections,
  updateAdminHomeSection,
  type ApiContent,
  type ApiHomeSection,
  type ApiHomeSectionItem,
  type ApiHomeSectionType,
  type ApiSeries,
  type ApiTvChannel,
} from "../lib/api";
import { fetchCatalogMovies, fetchCatalogSeries, useGenres } from "../hooks/adminQueries";
import { GENRE_OPTIONS } from "../lib/genres";
import { adminLabelClass, adminStatusLineClass } from "../lib/adminUi";
import {
  isRepeatableSection,
  sectionItemKind,
  sectionItemNoun,
  sectionLabel,
  sectionLimitProblem,
  sectionShowsTitle,
  sectionTypeInfo,
} from "../lib/homeSections";
import { queryKeys } from "../lib/queryKeys";

function movieRow(movie: ApiContent): HomeSectionPickerRow {
  return {
    id: movie.id,
    kind: "movie",
    title: movie.title,
    slug: movie.slug,
    meta: movie.is_published ? "Movie" : "Movie · Not published, won’t show",
    posterKey: movie.poster_key,
  };
}

function seriesRow(series: ApiSeries): HomeSectionPickerRow {
  return {
    id: series.id,
    kind: "series",
    title: series.title,
    slug: series.slug,
    meta: series.is_published ? "Series" : "Series · Not published, won’t show",
    posterKey: series.poster_key,
  };
}

function channelRow(channel: ApiTvChannel): HomeSectionPickerRow {
  return {
    id: channel.id,
    kind: "tv_channel",
    title: channel.name,
    slug: channel.slug,
    meta: channel.is_published ? "" : "Not published, won’t show",
    posterKey: channel.logo_key,
  };
}

/** Picks are shown straight away; this id marks one the server hasn't confirmed yet. */
const PENDING_ITEM_PREFIX = "pending-";

function isPendingItem(item: ApiHomeSectionItem) {
  return item.id.startsWith(PENDING_ITEM_PREFIX);
}

function emptyRailMessage(section: ApiHomeSection, noun: string) {
  if (section.auto_filled) {
    return {
      title: "Filled automatically",
      description: `The website picks these ${noun} for now. Add your own to choose them by hand.`,
    };
  }
  return {
    title: "Not on the page yet",
    description: `This row stays off the home page until you add ${noun}.`,
  };
}

export function HomeSectionsManager() {
  const queryClient = useQueryClient();
  const { data: genreRows } = useGenres();

  const sectionsQuery = useQuery({
    queryKey: queryKeys.homeSections,
    queryFn: listAdminHomeSections,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** On phones the outline and the editor take turns; on desktop both show. */
  const [showEditorOnPhone, setShowEditorOnPhone] = useState(false);
  /** Only the dialogs and the title form wait for the server; everything else is optimistic. */
  const [isSaving, setIsSaving] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiHomeSection | null>(null);
  /** Per-section title edits — avoids syncing draft via useEffect. */
  const [titleBySection, setTitleBySection] = useState<Record<string, string>>({});
  const [limitBySection, setLimitBySection] = useState<Record<string, string>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [catalogRows, setCatalogRows] = useState<HomeSectionPickerRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());

  const sections = useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data]);
  const activeSectionId = selectedId ?? sections[0]?.id ?? null;
  const activeIndex = sections.findIndex((s) => s.id === activeSectionId);
  const section = activeIndex >= 0 ? sections[activeIndex] : null;

  const detailQuery = useQuery({
    queryKey: queryKeys.homeSection(activeSectionId ?? ""),
    queryFn: () => getAdminHomeSection(activeSectionId!),
    enabled: section ? sectionItemKind(section.type) !== null : false,
  });

  const selected = detailQuery.data ?? null;
  const items = useMemo(() => selected?.items ?? [], [selected?.items]);
  const listedIds = useMemo(() => new Set(items.map((i) => i.ref_id)), [items]);

  const savedTitle = section?.title ?? "";
  const titleDraft = section ? (titleBySection[section.id] ?? savedTitle) : "";
  const titleChanged = titleDraft.trim() !== savedTitle.trim();
  const canEditLimit = section?.max_item_limit != null;
  const limitDraft = section
    ? (limitBySection[section.id] ?? String(section.item_limit ?? ""))
    : "";
  /** Empty means "use the default". */
  const typedLimit = limitDraft.trim() === "" ? null : Number(limitDraft);
  const limitChanged =
    canEditLimit && (typedLimit ?? section.default_item_limit) !== section.item_limit;
  const limitProblem = section && limitChanged ? sectionLimitProblem(section, typedLimit) : null;

  const genreOptions = useMemo(() => {
    const names = genreRows?.map((g) => g.name).filter(Boolean) ?? [...GENRE_OPTIONS];
    return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
  }, [genreRows]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.homeSections });
  };

  /** Saves run one at a time, in the order they were made, so quick clicks can't race. */
  const enqueueWrite = <T,>(write: () => Promise<T>) => {
    const result = writeQueue.current.then(write);
    writeQueue.current = result.catch(() => undefined);
    return result;
  };

  /** The screen already moved on, so a failed save reloads what the server really has. */
  const recoverFromFailedWrite = (err: unknown, fallback: string) => {
    toast.error(err instanceof Error ? err.message : fallback);
    invalidate();
  };

  const updateCachedItems = (
    sectionId: string,
    update: (current: ApiHomeSectionItem[]) => ApiHomeSectionItem[],
  ) => {
    const detailKey = queryKeys.homeSection(sectionId);
    void queryClient.cancelQueries({ queryKey: detailKey });
    const detail = queryClient.getQueryData<ApiHomeSection>(detailKey);
    if (!detail) return;
    const nextItems = update(detail.items);
    queryClient.setQueryData<ApiHomeSection>(detailKey, {
      ...detail,
      items: nextItems,
      item_count: nextItems.length,
    });
    queryClient.setQueryData<ApiHomeSection[]>(queryKeys.homeSections, (rows) =>
      rows?.map((row) => (row.id === sectionId ? { ...row, item_count: nextItems.length } : row)),
    );
  };

  const prefetchSection = (target: ApiHomeSection) => {
    if (sectionItemKind(target.type) === null) return;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.homeSection(target.id),
      queryFn: () => getAdminHomeSection(target.id),
    });
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setShowEditorOnPhone(true);
    window.scrollTo({ top: 0 });
  };

  const handleReorderSections = async (next: ApiHomeSection[]) => {
    void queryClient.cancelQueries({ queryKey: queryKeys.homeSections, exact: true });
    queryClient.setQueryData(queryKeys.homeSections, next);
    try {
      await enqueueWrite(() => reorderAdminHomeSections(next.map((s) => s.id)));
    } catch (err) {
      recoverFromFailedWrite(err, "Could not reorder sections.");
    }
  };

  const moveActiveSection = async (direction: -1 | 1) => {
    const nextIndex = activeIndex + direction;
    if (activeIndex < 0 || nextIndex < 0 || nextIndex >= sections.length) return;
    const next = [...sections];
    const [row] = next.splice(activeIndex, 1);
    next.splice(nextIndex, 0, row!);
    await handleReorderSections(next);
  };

  const handleToggleVisible = async (target: ApiHomeSection) => {
    const isVisible = !target.is_visible;
    void queryClient.cancelQueries({ queryKey: queryKeys.homeSections, exact: true });
    queryClient.setQueryData<ApiHomeSection[]>(queryKeys.homeSections, (rows) =>
      rows?.map((row) => (row.id === target.id ? { ...row, is_visible: isVisible } : row)),
    );
    try {
      await enqueueWrite(() => updateAdminHomeSection(target.id, { isVisible }));
    } catch (err) {
      recoverFromFailedWrite(err, "Could not update visibility.");
    }
  };

  const handleSaveSettings = async () => {
    if (!section || limitProblem) return;
    setIsSaving(true);
    try {
      await updateAdminHomeSection(section.id, {
        ...(titleChanged ? { title: titleDraft.trim() || null } : {}),
        ...(limitChanged ? { itemLimit: typedLimit } : {}),
      });
      toast.success("Section saved");
      setLimitBySection((prev) => {
        const next = { ...prev };
        delete next[section.id];
        return next;
      });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this section.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSection = async (input: {
    type: ApiHomeSectionType;
    title: string;
    genre: string;
  }) => {
    setIsSaving(true);
    try {
      const created = await createAdminHomeSection({
        type: input.type,
        title: input.type === "custom" ? input.title : null,
        genreName: input.type === "genre" ? input.genre : null,
        sortOrder: sections.length,
      });
      setShowAddSection(false);
      setSelectedId(created.id);
      setShowEditorOnPhone(true);
      invalidate();
      toast.success("Section added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add section.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteAdminHomeSection(deleteTarget.id);
      if (activeSectionId === deleteTarget.id) setSelectedId(null);
      setShowEditorOnPhone(false);
      setDeleteTarget(null);
      invalidate();
      toast.success("Section deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete section.");
    } finally {
      setIsSaving(false);
    }
  };

  const openPicker = async () => {
    if (!section) return;
    setCatalogRows([]);
    setShowPicker(true);
    setCatalogLoading(true);
    try {
      if (section.type === "tv") {
        const page = await listAdminTvChannels({ page: 1, pageSize: 100 });
        setCatalogRows((page.items ?? []).map(channelRow));
      } else if (section.type === "series") {
        setCatalogRows((await fetchCatalogSeries(queryClient)).map(seriesRow));
      } else if (section.type === "custom") {
        const [movies, series] = await Promise.all([
          fetchCatalogMovies(queryClient),
          fetchCatalogSeries(queryClient),
        ]);
        setCatalogRows([...movies.map(movieRow), ...series.map(seriesRow)]);
      } else {
        setCatalogRows((await fetchCatalogMovies(queryClient)).map(movieRow));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load catalog.");
      setShowPicker(false);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleAddItem = async (row: HomeSectionPickerRow) => {
    if (!section) return;
    const sectionId = section.id;
    const pendingId = `${PENDING_ITEM_PREFIX}${row.id}`;
    const sortOrder =
      queryClient.getQueryData<ApiHomeSection>(queryKeys.homeSection(sectionId))?.items.length ?? 0;
    updateCachedItems(sectionId, (current) => [
      ...current,
      {
        id: pendingId,
        section_id: sectionId,
        item_kind: row.kind,
        ref_id: row.id,
        sort_order: sortOrder,
        created_at: "",
        updated_at: "",
        label: row.title,
        poster_key: row.posterKey,
        slug: row.slug,
      },
    ]);
    try {
      const created = await enqueueWrite(() =>
        createAdminHomeSectionItem(sectionId, {
          itemKind: row.kind,
          refId: row.id,
          sortOrder,
        }),
      );
      updateCachedItems(sectionId, (current) =>
        current.map((item) => (item.id === pendingId ? created : item)),
      );
    } catch (err) {
      updateCachedItems(sectionId, (current) => current.filter((item) => item.id !== pendingId));
      recoverFromFailedWrite(err, "Could not add this item.");
    }
  };

  const handleRemoveItem = async (item: ApiHomeSectionItem) => {
    updateCachedItems(item.section_id, (current) => current.filter((row) => row.id !== item.id));
    try {
      await enqueueWrite(() => deleteAdminHomeSectionItem(item.id));
      toast.success(`Removed “${item.label ?? "item"}”`);
    } catch (err) {
      recoverFromFailedWrite(err, "Could not remove item.");
    }
  };

  const handleReorderItems = async (next: ApiHomeSectionItem[]) => {
    if (!section) return;
    const sectionId = section.id;
    updateCachedItems(sectionId, () =>
      next.map((item, index) => ({ ...item, sort_order: index })),
    );
    try {
      await enqueueWrite(() =>
        reorderAdminHomeSectionItems(
          sectionId,
          next.map((item) => item.id),
        ),
      );
    } catch (err) {
      recoverFromFailedWrite(err, "Could not reorder.");
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row!);
    void handleReorderItems(next);
  };

  if (sectionsQuery.isLoading) return <InlineLoading label="Loading sections" />;

  if (sectionsQuery.error) {
    return (
      <AdminErrorAlert
        message={
          sectionsQuery.error instanceof Error
            ? sectionsQuery.error.message
            : "Could not load sections."
        }
        onRetry={() => void sectionsQuery.refetch()}
      />
    );
  }

  const addDialog = showAddSection ? (
    <HomeSectionAddDialog
      sections={sections}
      genreOptions={genreOptions}
      isSaving={isSaving}
      onCreate={(input) => void handleCreateSection(input)}
      onClose={() => setShowAddSection(false)}
    />
  ) : null;

  if (sections.length === 0) {
    return (
      <>
        <AdminEmptyState
          title="No sections yet"
          description="Add the first section to start building the home page."
          action={<Button onClick={() => setShowAddSection(true)}>Add section</Button>}
        />
        {addDialog}
      </>
    );
  }

  const canPickItems = section ? sectionItemKind(section.type) !== null : false;
  const limit = section?.item_limit ?? null;
  const atLimit = limit != null && items.length >= limit;
  const noun = section ? sectionItemNoun(section.type) : "titles";
  const isChannelRail = section?.type === "tv";
  const hasPendingItems = items.some(isPendingItem);
  const showPosterKind = section?.type === "custom";
  const name = section ? sectionLabel(section) : "";

  const addItemsButton = (
    <Button
      type="button"
      size="sm"
      disabled={atLimit}
      icon={<Plus size={14} aria-hidden />}
      onClick={() => void openPicker()}
    >
      Add {noun}
    </Button>
  );

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div
          className={[
            "lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto lg:rounded-xl",
            showEditorOnPhone ? "hidden" : "",
          ].join(" ")}
        >
          <HomeSectionOutline
            sections={sections}
            activeId={activeSectionId}
            onSelect={handleSelect}
            onPreview={prefetchSection}
            onReorder={handleReorderSections}
            onToggleVisible={(target) => void handleToggleVisible(target)}
            onAdd={() => setShowAddSection(true)}
          />
        </div>

        {section ? (
          <div className={["min-w-0 space-y-4 lg:block", showEditorOnPhone ? "" : "hidden"].join(" ")}>
            <button
              type="button"
              onClick={() => setShowEditorOnPhone(false)}
              className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text lg:hidden"
            >
              <ArrowLeft size={15} aria-hidden />
              All sections
            </button>

            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-text">{name}</h2>
                <p className="mt-0.5 text-sm text-text-muted">
                  {section.type === "genre" && section.genre_name
                    ? `${section.genre_name} movie posters, linked to that genre’s page.`
                    : sectionTypeInfo(section.type).description}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span className={adminStatusLineClass(section.is_visible ? "success" : "muted")}>
                    {section.is_visible ? "Showing on home" : "Hidden from home"}
                  </span>
                  <span className="tabular-nums">
                    Section {activeIndex + 1} of {sections.length}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Move section up"
                  title="Move up"
                  disabled={activeIndex <= 0}
                  onClick={() => void moveActiveSection(-1)}
                  className="w-7 !px-0"
                >
                  <ArrowUp size={14} aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Move section down"
                  title="Move down"
                  disabled={activeIndex >= sections.length - 1}
                  onClick={() => void moveActiveSection(1)}
                  className="w-7 !px-0"
                >
                  <ArrowDown size={14} aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={
                    section.is_visible ? (
                      <EyeOff size={14} aria-hidden />
                    ) : (
                      <Eye size={14} aria-hidden />
                    )
                  }
                  onClick={() => void handleToggleVisible(section)}
                >
                  {section.is_visible ? "Hide from home" : "Show on home"}
                </Button>
                {isRepeatableSection(section.type) ? (
                  <Button
                    type="button"
                    variant="danger-soft"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => setDeleteTarget(section)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </header>

            {sectionShowsTitle(section.type) ? (
              <form
                className="rounded-xl border border-border bg-surface p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if ((titleChanged || limitChanged) && !limitProblem) void handleSaveSettings();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <div className="min-w-0">
                    <label className={adminLabelClass} htmlFor="home-section-title">
                      Title on the website
                    </label>
                    <Input
                      id="home-section-title"
                      value={titleDraft}
                      onChange={(event) =>
                        setTitleBySection((prev) => ({
                          ...prev,
                          [section.id]: event.target.value,
                        }))
                      }
                      placeholder={section.genre_name ?? sectionTypeInfo(section.type).label}
                    />
                    <p className="mt-1.5 text-xs text-text-muted">
                      Leave empty to use the default title, translated for each viewer.
                    </p>
                  </div>
                  {canEditLimit ? (
                    <div>
                      <label className={adminLabelClass} htmlFor="home-section-limit">
                        Most {noun} shown
                      </label>
                      <Input
                        id="home-section-limit"
                        type="number"
                        inputMode="numeric"
                        min={Math.max(section.item_count, 1)}
                        max={section.max_item_limit ?? undefined}
                        error={Boolean(limitProblem)}
                        value={limitDraft}
                        onChange={(event) =>
                          setLimitBySection((prev) => ({
                            ...prev,
                            [section.id]: event.target.value,
                          }))
                        }
                        placeholder={String(section.default_item_limit ?? "")}
                      />
                      <p className="mt-1.5 text-xs text-text-muted">
                        Default {section.default_item_limit}, up to {section.max_item_limit}
                      </p>
                    </div>
                  ) : null}
                </div>
                {limitProblem ? (
                  <p className="mt-2 text-xs font-medium text-danger">{limitProblem}</p>
                ) : null}
                {titleChanged || limitChanged ? (
                  <div className="mt-4 flex justify-end">
                    <Button type="submit" loading={isSaving} disabled={Boolean(limitProblem)}>
                      Save changes
                    </Button>
                  </div>
                ) : null}
              </form>
            ) : null}

            {section.type === "hero" ? (
              <HeroFeaturedManager />
            ) : section.type === "banners" ? (
              <PromotionBannerManager />
            ) : section.type === "plans" ? (
              <AdminCard title="Plan cards">
                <p className="text-sm text-text-muted">
                  These cards come from your subscription plans.{" "}
                  <Link href="/plans" className="font-medium text-brand hover:underline">
                    Manage plans
                  </Link>
                </p>
              </AdminCard>
            ) : canPickItems ? (
              <AdminCard
                title={
                  limit != null
                    ? `${noun[0]!.toUpperCase()}${noun.slice(1)} · ${items.length} of ${limit}`
                    : noun
                }
                headerAction={items.length > 0 ? addItemsButton : undefined}
              >
                {detailQuery.isLoading ? (
                  <InlineLoading label="Loading section" minHeight="sm" />
                ) : items.length === 0 ? (
                  <AdminEmptyState
                    {...emptyRailMessage(section, noun)}
                    action={addItemsButton}
                  />
                ) : (
                  <>
                    <p className="-mt-1 mb-3 text-xs text-text-muted">
                      Same order as the website.
                      {items.length > 1 ? (
                        <>
                          {" "}
                          <span className="[@media(hover:none)]:hidden">Drag to rearrange.</span>
                          <span className="hidden [@media(hover:none)]:inline">
                            Use the arrows to rearrange.
                          </span>
                        </>
                      ) : null}
                      {atLimit && canEditLimit ? ` This section is full. Raise “Most ${noun} shown” to add more.` : null}
                    </p>
                    <SortableList
                      items={items}
                      layout="grid"
                      disabled={hasPendingItems}
                      onReorder={handleReorderItems}
                      renderItem={(item, index) => (
                        <div className={isPendingItem(item) ? "opacity-60" : "group/item"}>
                          <div className="relative">
                            <AdminMediaThumb
                              objectKey={item.poster_key}
                              alt=""
                              emptyLabel={isChannelRail ? "No logo" : "No poster"}
                              className={[
                                "w-full rounded-lg border-0",
                                isChannelRail ? "aspect-video" : "aspect-2/3",
                              ].join(" ")}
                            />
                            <span className="absolute left-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-md bg-surface/95 px-1 text-xs font-medium tabular-nums text-text ring-1 ring-black/5">
                              {index + 1}
                            </span>
                            <div
                              hidden={hasPendingItems}
                              className="absolute right-1.5 top-1.5 flex gap-0.5 rounded-md bg-surface/95 p-0.5 opacity-0 ring-1 ring-black/5 transition-opacity focus-within:opacity-100 group-hover/item:opacity-100 [@media(hover:none)]:inset-x-1.5 [@media(hover:none)]:bottom-1.5 [@media(hover:none)]:bg-surface [@media(hover:none)]:top-auto [@media(hover:none)]:justify-between [@media(hover:none)]:opacity-100"
                            >
                              <button
                                type="button"
                                aria-label={`Move ${item.label ?? "item"} earlier`}
                                disabled={index === 0}
                                onClick={() => moveItem(index, -1)}
                                className="grid size-5 place-items-center rounded text-text-muted transition-colors hover:text-text disabled:opacity-30"
                              >
                                <ChevronLeft size={13} aria-hidden />
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${item.label ?? "item"} later`}
                                disabled={index === items.length - 1}
                                onClick={() => moveItem(index, 1)}
                                className="grid size-5 place-items-center rounded text-text-muted transition-colors hover:text-text disabled:opacity-30"
                              >
                                <ChevronRight size={13} aria-hidden />
                              </button>
                              <button
                                type="button"
                                aria-label={`Remove ${item.label ?? "item"}`}
                                onClick={() => void handleRemoveItem(item)}
                                className="grid size-5 place-items-center rounded text-text-muted transition-colors hover:text-danger"
                              >
                                <X size={13} aria-hidden />
                              </button>
                            </div>
                          </div>
                          <p className="mt-1.5 truncate text-sm font-medium text-text">
                            {item.label ?? "Unavailable"}
                          </p>
                          {showPosterKind ? (
                            <p className="truncate text-xs capitalize text-text-muted">
                              {item.item_kind}
                            </p>
                          ) : null}
                        </div>
                      )}
                    />
                  </>
                )}
              </AdminCard>
            ) : null}
          </div>
        ) : null}
      </div>

      {addDialog}

      {deleteTarget ? (
        <Dialog
          title="Delete section"
          description={`Remove “${sectionLabel(deleteTarget)}” from the home page? Its picked ${sectionItemNoun(deleteTarget.type)} stay in your catalog.`}
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={isSaving}
                onClick={() => void handleDeleteSection()}
              >
                Delete section
              </Button>
            </>
          }
        />
      ) : null}

      {showPicker && section ? (
        <HomeSectionPicker
          sectionName={name}
          noun={noun}
          rows={catalogRows}
          loading={catalogLoading}
          listedIds={listedIds}
          limit={limit}
          onAdd={(row) => void handleAddItem(row)}
          onClose={() => setShowPicker(false)}
        />
      ) : null}
    </>
  );
}
