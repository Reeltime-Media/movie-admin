"use client";

import { ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Episode, Season } from "../lib/adminData";
import { AdminDownloadSourceButton } from "./AdminDownloadSourceButton";
import { Button } from "./ui/Button";
import { newEpisodeId, newSeasonId, renumberSeasons } from "../lib/seriesHelpers";

const inputClass =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-disabled hover:border-border-hover focus:border-brand/50 focus:bg-surface";

const fileInputClass =
  "mt-1 w-full rounded-lg border border-dashed border-border bg-surface-elevated px-3 py-2.5 text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:border-border-hover";

type SeasonsEpisodesEditorProps = {
  seasons: Season[];
  onChange: (next: Season[]) => void;
  /** When true, compact list + per-episode Edit popup with replace video/poster. */
  allowAssetReplace?: boolean;
};

function EpisodePosterThumb({
  posterFile,
  posterUrl,
  title,
  size = "sm",
}: {
  posterFile?: File;
  posterUrl?: string | null;
  title: string;
  size?: "sm" | "md";
}) {
  const localUrl = useMemo(
    () => (posterFile ? URL.createObjectURL(posterFile) : null),
    [posterFile],
  );

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  const box = size === "md" ? "aspect-2/3 w-28" : "aspect-2/3 w-10";

  const src = localUrl ?? posterUrl ?? null;
  if (!src) {
    return (
      <div
        className={`grid ${box} shrink-0 place-items-center rounded-md border border-dashed border-border bg-bg text-center text-[9px] leading-tight text-text-disabled`}
      >
        —
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${title} poster`}
      className={`${box} shrink-0 rounded-md border border-border object-cover`}
    />
  );
}

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

export function SeasonsEpisodesEditor({
  seasons,
  onChange,
  allowAssetReplace = false,
}: SeasonsEpisodesEditorProps) {
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [didInitSeason, setDidInitSeason] = useState(false);
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

  const setEpisodeAsset = (
    seasonId: string,
    episodeId: string,
    kind: "video" | "poster",
    files: FileList | null,
  ) => {
    const file = files?.[0] ?? null;
    const name = file?.name?.trim() ?? "";
    if (kind === "video") {
      updateEpisode(seasonId, episodeId, {
        videoFileName: name || undefined,
        videoFile: file ?? undefined,
      });
      return;
    }
    updateEpisode(seasonId, episodeId, {
      posterFileName: name || undefined,
      posterFile: file ?? undefined,
    });
  };

  const addSeason = () => {
    const id = newSeasonId();
    emit([
      ...seasons,
      {
        id,
        number: seasons.length + 1,
        title: `Season ${seasons.length + 1}`,
        episodes: [
          {
            id: newEpisodeId(),
            number: 1,
            title: "Episode 1",
            runtime: "",
          },
        ],
      },
    ]);
    setActiveSeasonId(id);
  };

  const removeSeason = (seasonId: string) => {
    if (seasons.length <= 1) return;
    const removed = seasons.find((s) => s.id === seasonId);
    if (removed?.episodes.some((ep) => ep.id === editingEpisodeId)) {
      setEditingEpisodeId(null);
    }
    const next = seasons.filter((s) => s.id !== seasonId);
    emit(next);
    setActiveSeasonId(next[0]?.id ?? null);
  };

  const addEpisode = (seasonId: string) => {
    const newId = newEpisodeId();
    emit(
      seasons.map((s) => {
        if (s.id !== seasonId) return s;
        const n = s.episodes.length + 1;
        return {
          ...s,
          episodes: [
            ...s.episodes,
            {
              id: newId,
              number: n,
              title: `Episode ${n}`,
              runtime: "",
            },
          ],
        };
      }),
    );
    if (allowAssetReplace) {
      setEditingEpisodeId(newId);
    }
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

  // Compact create-wizard layout (inline fields)
  if (!allowAssetReplace) {
    return (
      <div className="space-y-5">
        {seasons.map((season) => (
          <div key={season.id} className="rounded-xl border border-border bg-bg/40 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
              <label className="block min-w-[200px] flex-1 sm:max-w-xs">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-[0.12em] text-text-disabled">
                  Season label
                </span>
                <input
                  className={inputClass}
                  value={season.title}
                  onChange={(e) => updateSeason(season.id, { title: e.target.value })}
                  placeholder="Season 1"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => addEpisode(season.id)}>
                  Add episode
                </Button>
                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  onClick={() => removeSeason(season.id)}
                  disabled={seasons.length <= 1}
                >
                  Remove season
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="hidden text-2xs font-bold uppercase tracking-widest text-text-disabled sm:grid sm:grid-cols-[52px_minmax(0,1fr)_100px_72px_80px] sm:gap-2 sm:px-1">
                <span>Ep</span>
                <span>Title</span>
                <span>Runtime</span>
                <span>Free</span>
                <span className="text-right"> </span>
              </div>

              {season.episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="flex flex-col gap-2 rounded-lg border border-dashed border-border/80 bg-surface/50 p-3 sm:grid sm:grid-cols-[52px_minmax(0,1fr)_100px_72px_80px] sm:items-center sm:gap-2 sm:border-0 sm:bg-transparent sm:p-1"
                >
                  <div className="text-xs font-bold text-text-muted">E{ep.number}</div>
                  <input
                    className={inputClass}
                    value={ep.title}
                    onChange={(e) => updateEpisode(season.id, ep.id, { title: e.target.value })}
                    placeholder="Episode title"
                  />
                  <input
                    className={inputClass}
                    value={ep.runtime}
                    onChange={(e) => updateEpisode(season.id, ep.id, { runtime: e.target.value })}
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
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={addSeason}>
            Add season
          </Button>
        </div>
      </div>
    );
  }

  // Edit mode — season accordion; click a season to reveal episodes
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
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
                      onClick={() => addEpisode(season.id)}
                      icon={<Plus size={14} aria-hidden />}
                    >
                      Add episode
                    </Button>
                    <Button
                      type="button"
                      variant="danger-soft"
                      size="sm"
                      onClick={() => removeSeason(season.id)}
                      disabled={seasons.length <= 1}
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
                    const hasPendingAssets = Boolean(ep.videoFile || ep.posterFile);
                    const status = ep.hlsMasterKey
                      ? { tone: "ok" as const, label: "HLS ready" }
                      : ep.slug
                        ? { tone: "muted" as const, label: "No HLS yet" }
                        : ep.videoFile
                          ? { tone: "ok" as const, label: "Video ready" }
                          : { tone: "warn" as const, label: "Needs video" };

                    return (
                      <div
                        key={ep.id}
                        className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-elevated/50 sm:px-4"
                      >
                        <div className="w-8 shrink-0 text-center text-2xs font-bold tabular-nums text-brand">
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
                              <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                                Free
                              </span>
                            ) : null}
                            <StatusDot tone={status.tone} label={status.label} />
                            {hasPendingAssets ? (
                              <span className="text-2xs font-semibold text-brand">Pending save</span>
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
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

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

      {editingContext ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
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
                <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-text-disabled">
                  {editingContext.season.title} · Episode {editingContext.episode.number}
                </p>
                <h2
                  id="episode-edit-title"
                  className="mt-1 line-clamp-2 text-lg font-semibold tracking-[-0.02em] text-text"
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
                  <span className="mb-1.5 block text-2xs font-semibold uppercase tracking-[0.12em] text-text-disabled">
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
                  <span className="mb-1.5 block text-2xs font-semibold uppercase tracking-[0.12em] text-text-disabled">
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

              <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                <EpisodePosterThumb
                  posterFile={editingContext.episode.posterFile}
                  posterUrl={editingContext.episode.posterUrl}
                  title={editingContext.episode.title}
                  size="md"
                />
                <div className="space-y-4">
                  <div>
                    <span className="block text-2xs font-semibold text-text-muted">
                      {editingContext.episode.slug ? "Replace video" : "Video (required)"}
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/*"
                      className={fileInputClass}
                      onChange={(e) =>
                        setEpisodeAsset(
                          editingContext.season.id,
                          editingContext.episode.id,
                          "video",
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
                  <div>
                    <span className="block text-2xs font-semibold text-text-muted">
                      {editingContext.episode.slug ? "Replace poster" : "Poster (optional)"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className={fileInputClass}
                      onChange={(e) =>
                        setEpisodeAsset(
                          editingContext.season.id,
                          editingContext.episode.id,
                          "poster",
                          e.target.files,
                        )
                      }
                    />
                    {editingContext.episode.posterFile ? (
                      <p className="mt-1 break-all text-2xs text-text-muted">
                        {editingContext.episode.slug ? "New" : "Selected"}:{" "}
                        {editingContext.episode.posterFile.name}
                      </p>
                    ) : (
                      <p className="mt-1 text-2xs text-text-disabled">
                        Optional — leave empty to keep current
                      </p>
                    )}
                  </div>
                </div>
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
