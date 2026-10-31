"use client";

import { ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Episode, Season } from "../lib/adminData";
import { AdminDownloadSourceButton } from "./AdminDownloadSourceButton";
import { Button } from "./ui/Button";
import { newEpisodeId, newSeasonId, renumberSeasons } from "../lib/seriesHelpers";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-disabled hover:border-border-hover focus:border-brand";

const fileInputClass =
  "mt-1 w-full rounded-lg border border-dashed border-border bg-surface px-3 py-2.5 text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-elevated file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text hover:border-border-hover";

type SeasonsEpisodesEditorProps = {
  seasons: Season[];
  onChange: (next: Season[]) => void;
  /** When true, compact list + per-episode Edit popup with replace video. */
  allowAssetReplace?: boolean;
  /** Create wizard: title + video on the same row. */
  includeVideo?: boolean;
};

function StatusDot({ tone, label }: { tone: "ok" | "warn" | "muted"; label: string }) {
  const color =
    tone === "ok"
      ? "bg-success"
      : tone === "warn"
        ? "bg-warning"
        : "bg-text-disabled";
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-text-muted">
      <span className={`size-1.5 shrink-0 rounded-full ${color}`} aria-hidden />
      {label}
    </span>
  );
}

function EpisodeRowMenu({
  canDownload,
  canRemove,
  contentId,
  title,
  onEdit,
  onRemove,
}: {
  canDownload: boolean;
  canRemove: boolean;
  contentId?: string;
  title: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative flex items-center gap-1" ref={rootRef}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onEdit}
        icon={<Pencil size={14} aria-hidden />}
      >
        Edit
      </Button>
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-muted transition-colors hover:border-border-hover hover:text-text"
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-44 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-md">
          {canDownload && contentId ? (
            <AdminDownloadSourceButton
              contentId={contentId}
              label={title}
              variant="ghost"
              className="w-full justify-start !h-8 px-2.5"
            />
          ) : null}
          <button
            type="button"
            disabled={!canRemove}
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-40"
          >
            <Trash2 size={14} aria-hidden />
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

const EPISODE_COUNT_PRESETS = [4, 6, 8, 10, 12, 16, 20, 24] as const;
const MAX_EPISODES_PER_SEASON = 100;

function buildEpisodes(count: number, existing: Episode[] = []): Episode[] {
  const n = Math.min(MAX_EPISODES_PER_SEASON, Math.max(1, Math.floor(count)));
  const saved = existing.filter((ep) => Boolean(ep.slug));
  const floor = saved.length;
  const target = Math.max(n, floor);

  const next: Episode[] = [];
  for (let i = 0; i < target; i += 1) {
    const prev = existing[i];
    if (prev) {
      next.push({ ...prev, number: i + 1 });
    } else {
      next.push({
        id: newEpisodeId(),
        number: i + 1,
        title: `Episode ${i + 1}`,
        runtime: "",
      });
    }
  }
  return next;
}

export function SeasonsEpisodesEditor({
  seasons,
  onChange,
  allowAssetReplace = false,
  includeVideo = false,
}: SeasonsEpisodesEditorProps) {
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [didInitSeason, setDidInitSeason] = useState(false);
  /** Season id waiting for an episode-count choice (null = closed). */
  const [episodeCountForSeasonId, setEpisodeCountForSeasonId] = useState<string | null>(null);
  const [episodeCountInput, setEpisodeCountInput] = useState("12");
  const emit = (next: Season[]) => onChange(renumberSeasons(next));

  useEffect(() => {
    if (!seasons.length) return;
    // Open the first season once on load; allow collapsing afterward.
    if (!didInitSeason) {
      setActiveSeasonId(seasons[0].id);
      setDidInitSeason(true);
      return;
    }
    // If the open season was deleted, fall back to the first remaining one.
    if (activeSeasonId && !seasons.some((s) => s.id === activeSeasonId)) {
      setActiveSeasonId(seasons[0]?.id ?? null);
    }
  }, [seasons, activeSeasonId, didInitSeason]);

  let editingContext: { season: Season; episode: Episode } | null = null;
  if (editingEpisodeId) {
    for (const season of seasons) {
      const episode = season.episodes.find((ep) => ep.id === editingEpisodeId);
      if (episode) {
        editingContext = { season, episode };
        break;
      }
    }
  }

  useEffect(() => {
    if (!editingEpisodeId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingEpisodeId(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editingEpisodeId]);

  const updateSeason = (seasonId: string, patch: Partial<Pick<Season, "title">>) => {
    emit(seasons.map((s) => (s.id === seasonId ? { ...s, ...patch } : s)));
  };

  const updateEpisode = (seasonId: string, episodeId: string, patch: Partial<Episode>) => {
    emit(
      seasons.map((s) => {
        if (s.id !== seasonId) return s;
        return {
          ...s,
          episodes: s.episodes.map((e) => (e.id === episodeId ? { ...e, ...patch } : e)),
        };
      }),
    );
  };

  const setEpisodeVideo = (seasonId: string, episodeId: string, files: FileList | null) => {
    const file = files?.[0] ?? null;
    const name = file?.name?.trim() ?? "";
    updateEpisode(seasonId, episodeId, {
      videoFileName: name || undefined,
      videoFile: file ?? undefined,
    });
  };

  const openEpisodeCountPrompt = (seasonId: string) => {
    const season = seasons.find((s) => s.id === seasonId);
    const current = season?.episodes.length ?? 12;
    setEpisodeCountInput(String(Math.max(1, current)));
    setEpisodeCountForSeasonId(seasonId);
  };

  const applyEpisodeCount = (raw: string | number) => {
    if (!episodeCountForSeasonId) return;
    const parsed = typeof raw === "number" ? raw : Number.parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    const seasonId = episodeCountForSeasonId;
    emit(
      seasons.map((s) => {
        if (s.id !== seasonId) return s;
        return { ...s, episodes: buildEpisodes(parsed, s.episodes) };
      }),
    );
    setEpisodeCountForSeasonId(null);
    setActiveSeasonId(seasonId);
  };

  const addSeason = () => {
    const id = newSeasonId();
    emit([
      ...seasons,
      {
        id,
        number: seasons.length + 1,
        title: `Season ${seasons.length + 1}`,
        episodes: buildEpisodes(1),
      },
    ]);
    setActiveSeasonId(id);
    setEpisodeCountInput("12");
    setEpisodeCountForSeasonId(id);
  };

  const removeSeason = (seasonId: string) => {
    const removed = seasons.find((s) => s.id === seasonId);
    if (removed?.episodes.some((ep) => ep.id === editingEpisodeId)) {
      setEditingEpisodeId(null);
    }
    if (episodeCountForSeasonId === seasonId) setEpisodeCountForSeasonId(null);
    const next = seasons.filter((s) => s.id !== seasonId);
    emit(next);
    setActiveSeasonId(next[0]?.id ?? null);
  };

  const removeEpisode = (seasonId: string, episodeId: string) => {
    if (editingEpisodeId === episodeId) setEditingEpisodeId(null);
    emit(
      seasons.map((s) => {
        if (s.id !== seasonId) return s;
        if (s.episodes.length <= 1) return s;
        return { ...s, episodes: s.episodes.filter((e) => e.id !== episodeId) };
      }),
    );
  };

  const closeEditor = () => setEditingEpisodeId(null);
  const activeSeason = activeSeasonId
    ? (seasons.find((s) => s.id === activeSeasonId) ?? null)
    : null;

  const episodeCountPrompt =
    episodeCountForSeasonId != null ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="episode-count-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) setEpisodeCountForSeasonId(null);
        }}
      >
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-md">
          <h2
            id="episode-count-title"
            className="text-base font-semibold tracking-tight text-text"
          >
            How many episodes?
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Pick a count — episode rows are created automatically (Episode 1, 2, …).
            Saved episodes are kept if you go lower than what’s already uploaded.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {EPISODE_COUNT_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => applyEpisodeCount(n)}
                className="min-w-11 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-semibold tabular-nums text-text transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand"
              >
                {n}
              </button>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">
              Or type a number
            </span>
            <input
              type="number"
              min={1}
              max={MAX_EPISODES_PER_SEASON}
              inputMode="numeric"
              autoFocus
              className={inputClass}
              value={episodeCountInput}
              onChange={(e) => setEpisodeCountInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyEpisodeCount(episodeCountInput);
                }
              }}
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEpisodeCountForSeasonId(null)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => applyEpisodeCount(episodeCountInput)}>
              Create episodes
            </Button>
          </div>
        </div>
      </div>
    ) : null;

  // Compact create-wizard layout (inline fields; optional video column)
  if (!allowAssetReplace) {
    const gridCols = includeVideo
      ? "sm:grid-cols-[44px_minmax(0,1.2fr)_88px_56px_minmax(140px,1fr)_72px]"
      : "sm:grid-cols-[52px_minmax(0,1fr)_100px_72px_80px]";

    return (
      <div className="space-y-5">
        {seasons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-bg/40 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-text">No seasons yet</p>
            <p className="mt-1 text-xs text-text-muted">
              Click Add season, then choose how many episodes.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4"
              onClick={addSeason}
              icon={<Plus size={14} aria-hidden />}
            >
              Add season
            </Button>
          </div>
        ) : null}
        {seasons.map((season) => {
          const seasonReady = season.episodes.filter(
            (ep) => Boolean(ep.videoFileName?.trim() || ep.videoFile),
          ).length;
          return (
            <div key={season.id} className="rounded-lg bg-surface-soft p-4">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                <label className="block min-w-[200px] flex-1 sm:max-w-xs">
                  <span className="mb-1 block text-xs font-medium text-text-muted">
                    Season label
                  </span>
                  <input
                    className={inputClass}
                    value={season.title}
                    onChange={(e) => updateSeason(season.id, { title: e.target.value })}
                    placeholder="Season 1"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {includeVideo && season.episodes.length > 0 ? (
                    <span
                      className={[
                        "rounded-md px-2 py-1 text-2xs font-semibold tabular-nums",
                        seasonReady === season.episodes.length
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning",
                      ].join(" ")}
                    >
                      {seasonReady}/{season.episodes.length} videos
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openEpisodeCountPrompt(season.id)}
                  >
                    Set episode count
                  </Button>
                  <Button
                    type="button"
                    variant="danger-soft"
                    size="sm"
                    onClick={() => removeSeason(season.id)}
                  >
                    Remove season
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div
                  className={`hidden text-xs font-medium text-text-muted sm:grid sm:gap-2 sm:px-1 ${gridCols}`}
                >
                  <span>Ep</span>
                  <span>Title</span>
                  <span>Runtime</span>
                  <span>Free</span>
                  {includeVideo ? <span>Video</span> : null}
                  <span className="text-right"> </span>
                </div>

                {season.episodes.map((ep) => {
                  const hasVideo = Boolean(ep.videoFileName?.trim() || ep.videoFile);
                  return (
                    <div
                      key={ep.id}
                      className={`flex flex-col gap-2 rounded-lg border border-dashed border-border/80 bg-surface/50 p-3 sm:grid sm:items-center sm:gap-2 sm:border-0 sm:bg-transparent sm:p-1 ${gridCols}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text-muted">E{ep.number}</span>
                        {includeVideo ? (
                          <span
                            className={[
                              "rounded px-1.5 py-0.5 text-xs font-medium sm:hidden",
                              hasVideo
                                ? "bg-success/15 text-success"
                                : "bg-warning/15 text-warning",
                            ].join(" ")}
                          >
                            {hasVideo ? "Video ✓" : "Needs video"}
                          </span>
                        ) : null}
                      </div>
                      <input
                        className={inputClass}
                        value={ep.title}
                        onChange={(e) =>
                          updateEpisode(season.id, ep.id, { title: e.target.value })
                        }
                        placeholder="Episode title"
                      />
                      <input
                        className={inputClass}
                        value={ep.runtime}
                        onChange={(e) =>
                          updateEpisode(season.id, ep.id, { runtime: e.target.value })
                        }
                        placeholder="45m"
                      />
                      <label className="flex items-center justify-center gap-2 text-xs font-semibold text-text-muted sm:justify-start">
                        <input
                          type="checkbox"
                          checked={Boolean(ep.isFree)}
                          onChange={(e) =>
                            updateEpisode(season.id, ep.id, { isFree: e.target.checked })
                          }
                          className="rounded border-border"
                        />
                        Free
                      </label>
                      {includeVideo ? (
                        <div className="min-w-0">
                          <div className="mb-1 hidden sm:block">
                            <StatusDot
                              tone={hasVideo ? "ok" : "warn"}
                              label={hasVideo ? "Ready" : "Needs video"}
                            />
                          </div>
                          <input
                            type="file"
                            accept="video/mp4,video/quicktime,application/x-mpegURL,video/*"
                            className={fileInputClass}
                            onChange={(e) => setEpisodeVideo(season.id, ep.id, e.target.files)}
                          />
                          {ep.videoFileName ? (
                            <p className="mt-0.5 truncate text-2xs text-text-muted">
                              {ep.videoFileName}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex justify-end sm:block">
                        <Button
                          type="button"
                          variant="danger-soft"
                          size="sm"
                          onClick={() => removeEpisode(season.id, ep.id)}
                          disabled={season.episodes.length <= 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {seasons.length > 0 ? (
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={addSeason}>
              Add season
            </Button>
          </div>
        ) : null}
        {episodeCountPrompt}
      </div>
    );
  }

  // Edit mode — season accordion; click a season to reveal episodes
  const newEpisodes = seasons.flatMap((s) => s.episodes.filter((ep) => !ep.slug));
  const newReady = newEpisodes.filter((ep) =>
    Boolean(ep.videoFileName?.trim() || ep.videoFile),
  ).length;
  const existingNoHls = seasons
    .flatMap((s) => s.episodes)
    .filter((ep) => Boolean(ep.slug) && !ep.hlsMasterKey).length;

  return (
    <div className="space-y-3">
      {seasons.length > 0 && (newEpisodes.length > 0 || existingNoHls > 0) ? (
        <div className="flex flex-wrap gap-2">
          {newEpisodes.length > 0 ? (
            <span
              className={[
                "rounded-lg border px-3 py-1.5 text-xs font-semibold tabular-nums",
                newReady === newEpisodes.length
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-warning/40 bg-warning/10 text-warning",
              ].join(" ")}
            >
              {newReady}/{newEpisodes.length} new videos ready
            </span>
          ) : null}
          {existingNoHls > 0 ? (
            <span className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-semibold tabular-nums text-text-muted">
              {existingNoHls} episode{existingNoHls === 1 ? "" : "s"} without HLS
            </span>
          ) : null}
        </div>
      ) : null}
      {seasons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-semibold text-text">No seasons yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Click Add season, then choose how many episodes.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            onClick={addSeason}
            icon={<Plus size={14} aria-hidden />}
          >
            Add season
          </Button>
        </div>
      ) : null}
      <div className={`overflow-hidden rounded-lg border border-border ${seasons.length === 0 ? "hidden" : ""}`}>
        {seasons.map((season, seasonIndex) => {
          const open = season.id === activeSeason?.id;
          return (
            <div
              key={season.id}
              className={seasonIndex > 0 ? "border-t border-border" : undefined}
            >
              <div
                className={[
                  "flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4",
                  open ? "bg-surface-elevated/60" : "bg-bg/20 hover:bg-surface-elevated/40",
                ].join(" ")}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() =>
                    setActiveSeasonId((prev) => (prev === season.id ? null : season.id))
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={[
                      "shrink-0 text-text-muted transition-transform",
                      open ? "rotate-0" : "-rotate-90",
                    ].join(" ")}
                  />
                  <span className="truncate text-sm font-semibold text-text">
                    {season.title || `Season ${season.number}`}
                  </span>
                  <span className="shrink-0 rounded-md bg-bg px-1.5 py-0.5 text-2xs font-semibold tabular-nums text-text-muted">
                    {season.episodes.length} ep
                  </span>
                </button>
                {open ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className={`${inputClass} h-8 max-w-48 py-1.5 text-xs`}
                      value={season.title}
                      onChange={(e) => updateSeason(season.id, { title: e.target.value })}
                      placeholder={`Season ${season.number}`}
                      aria-label="Season name"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openEpisodeCountPrompt(season.id)}
                      icon={<Plus size={14} aria-hidden />}
                    >
                      Set episode count
                    </Button>
                    <Button
                      type="button"
                      variant="danger-soft"
                      size="sm"
                      onClick={() => removeSeason(season.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>

              {open ? (
                <div className="divide-y divide-border/70 border-t border-border bg-bg/30">
                  {season.episodes.map((ep) => {
                    const isNewEpisode = !ep.slug;
                    const hasPendingAssets = Boolean(ep.videoFile);
                    const hasVideo = Boolean(ep.videoFileName?.trim() || ep.videoFile);
                    const status = ep.hlsMasterKey
                      ? { tone: "ok" as const, label: "HLS ready" }
                      : ep.slug
                        ? { tone: "muted" as const, label: "No HLS yet" }
                        : hasVideo
                          ? { tone: "ok" as const, label: "Video ready" }
                          : { tone: "warn" as const, label: "Needs video" };

                    return (
                      <div
                        key={ep.id}
                        className="group flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-surface-elevated/50 sm:flex-row sm:items-center sm:gap-3 sm:px-4"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="w-8 shrink-0 text-center text-xs tabular-nums text-text-muted">
                            E{ep.number}
                          </div>
                          <button
                            type="button"
                            className="min-w-0 flex-1 cursor-pointer text-left"
                            onClick={() => setEditingEpisodeId(ep.id)}
                          >
                            <div className="truncate text-sm font-semibold text-text group-hover:text-brand">
                              {ep.title || "Untitled episode"}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              <span className="text-2xs text-text-muted">
                                {ep.runtime || "No runtime"}
                              </span>
                              {ep.isFree ? (
                                <span className="text-xs font-medium text-success">
                                  Free
                                </span>
                              ) : null}
                              <StatusDot tone={status.tone} label={status.label} />
                              {hasPendingAssets ? (
                                <span className="text-2xs font-semibold text-brand">
                                  Pending save
                                </span>
                              ) : null}
                              {isNewEpisode ? (
                                <span className="text-2xs font-semibold text-warning">New</span>
                              ) : null}
                            </div>
                          </button>
                          <EpisodeRowMenu
                            canDownload={Boolean(ep.slug)}
                            canRemove={season.episodes.length > 1}
                            contentId={ep.slug ? ep.id : undefined}
                            title={ep.title}
                            onEdit={() => setEditingEpisodeId(ep.id)}
                            onRemove={() => removeEpisode(season.id, ep.id)}
                          />
                        </div>
                        {isNewEpisode ? (
                          <div className="min-w-0 sm:w-56 sm:shrink-0">
                            <input
                              type="file"
                              accept="video/mp4,video/quicktime,application/x-mpegURL,video/*"
                              className={fileInputClass}
                              onChange={(e) =>
                                setEpisodeVideo(season.id, ep.id, e.target.files)
                              }
                            />
                            {ep.videoFileName ? (
                              <p className="mt-0.5 truncate text-2xs text-text-muted">
                                {ep.videoFileName}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {seasons.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addSeason}
            icon={<Plus size={14} aria-hidden />}
          >
            Add season
          </Button>
        </div>
      ) : null}

      {episodeCountPrompt}

      {editingContext ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="episode-edit-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditor();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-surface shadow-md">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-medium text-text-muted">
                  {editingContext.season.title} · Episode {editingContext.episode.number}
                </p>
                <h2
                  id="episode-edit-title"
                  className="mt-1 line-clamp-2 text-lg font-semibold tracking-tight text-text"
                >
                  {editingContext.episode.title || `Episode ${editingContext.episode.number}`}
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  {editingContext.episode.slug
                    ? "Update details or replace assets"
                    : "New episode — attach a video, then Save changes"}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeEditor}>
                Close
              </Button>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-text-muted">
                    Title
                  </span>
                  <input
                    className={inputClass}
                    value={editingContext.episode.title}
                    onChange={(e) =>
                      updateEpisode(editingContext.season.id, editingContext.episode.id, {
                        title: e.target.value,
                      })
                    }
                    placeholder="Episode title"
                    autoFocus
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-text-muted">
                    Runtime
                  </span>
                  <input
                    className={inputClass}
                    value={editingContext.episode.runtime}
                    onChange={(e) =>
                      updateEpisode(editingContext.season.id, editingContext.episode.id, {
                        runtime: e.target.value,
                      })
                    }
                    placeholder="45m"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-text-muted">
                  <input
                    type="checkbox"
                    checked={Boolean(editingContext.episode.isFree)}
                    onChange={(e) =>
                      updateEpisode(editingContext.season.id, editingContext.episode.id, {
                        isFree: e.target.checked,
                      })
                    }
                    className="rounded border-border"
                  />
                  Free episode
                </label>
              </div>

              <div className="border-t border-border/60 pt-4">
                <span className="block text-2xs font-semibold text-text-muted">
                  {editingContext.episode.slug ? "Replace video" : "Video (required)"}
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/*"
                  className={fileInputClass}
                  onChange={(e) =>
                    setEpisodeVideo(
                      editingContext.season.id,
                      editingContext.episode.id,
                      e.target.files,
                    )
                  }
                />
                {editingContext.episode.videoFile ? (
                  <p className="mt-1 break-all text-2xs text-text-muted">
                    {editingContext.episode.slug ? "New" : "Selected"}:{" "}
                    {editingContext.episode.videoFile.name}
                  </p>
                ) : editingContext.episode.hlsMasterKey ? (
                  <p className="mt-1 text-2xs text-text-disabled">Current: HLS ready</p>
                ) : editingContext.episode.slug ? (
                  <p className="mt-1 text-2xs text-text-disabled">
                    Optional — leave empty to keep current
                  </p>
                ) : (
                  <p className="mt-1 text-2xs text-warning">
                    Required — attach a video, then Save changes.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 sm:px-6">
              <Button
                type="button"
                variant="danger-soft"
                size="sm"
                onClick={() =>
                  removeEpisode(editingContext.season.id, editingContext.episode.id)
                }
                disabled={editingContext.season.episodes.length <= 1}
              >
                Remove episode
              </Button>
              <Button type="button" size="sm" onClick={closeEditor}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
