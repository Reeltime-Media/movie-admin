"use client";

import { useEffect, useMemo, useState } from "react";
import type { Episode, Season } from "../lib/adminData";
import { Button } from "./ui/Button";
import { newEpisodeId, newSeasonId, renumberSeasons } from "../lib/seriesHelpers";

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-white focus:border-border-hover focus:bg-surface-elevated";

const fileInputClass =
  "mt-1 w-full rounded-lg border border-dashed border-border bg-bg px-3 py-2.5 text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:border-border-hover";

type SeasonsEpisodesEditorProps = {
  seasons: Season[];
  onChange: (next: Season[]) => void;
  /** When true, compact list + per-episode Edit panel with replace video/poster. */
  allowAssetReplace?: boolean;
};

function EpisodePosterThumb({
  posterFile,
  posterUrl,
  title,
}: {
  posterFile?: File;
  posterUrl?: string | null;
  title: string;
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

  const src = localUrl ?? posterUrl ?? null;
  if (!src) {
    return (
      <div className="grid aspect-2/3 w-16 place-items-center rounded border border-dashed border-border bg-bg text-center text-2xs text-text-disabled">
        No poster
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${title} poster`}
      className="aspect-2/3 w-16 rounded border border-border object-cover"
    />
  );
}

export function SeasonsEpisodesEditor({
  seasons,
  onChange,
  allowAssetReplace = false,
}: SeasonsEpisodesEditorProps) {
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const emit = (next: Season[]) => onChange(renumberSeasons(next));

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
    emit([
      ...seasons,
      {
        id: newSeasonId(),
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
  };

  const removeSeason = (seasonId: string) => {
    if (seasons.length <= 1) return;
    const removed = seasons.find((s) => s.id === seasonId);
    if (removed?.episodes.some((ep) => ep.id === editingEpisodeId)) {
      setEditingEpisodeId(null);
    }
    emit(seasons.filter((s) => s.id !== seasonId));
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

  const toggleEditEpisode = (episodeId: string) => {
    setEditingEpisodeId((prev) => (prev === episodeId ? null : episodeId));
  };

  return (
    <div className="space-y-5">
      {seasons.map((season) => (
        <div
          key={season.id}
          className="rounded-lg border border-border bg-bg p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div className="grid min-w-[200px] flex-1 gap-2 sm:max-w-xs">
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold text-text-disabled">
                  Season label
                </span>
                <input
                  className={inputClass}
                  value={season.title}
                  onChange={(e) => updateSeason(season.id, { title: e.target.value })}
                  placeholder="Season 1"
                />
              </label>
            </div>
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
            {!allowAssetReplace ? (
              <div className="hidden text-2xs font-bold uppercase tracking-widest text-text-disabled sm:grid sm:grid-cols-[52px_minmax(0,1fr)_100px_72px_80px] sm:gap-2 sm:px-1">
                <span>Ep</span>
                <span>Title</span>
                <span>Runtime</span>
                <span>Free</span>
                <span className="text-right"> </span>
              </div>
            ) : null}

            {season.episodes.map((ep) => {
              const isEditing = allowAssetReplace && editingEpisodeId === ep.id;
              const canReplaceAssets = allowAssetReplace && Boolean(ep.slug);
              const hasPendingAssets = Boolean(ep.videoFile || ep.posterFile);

              if (!allowAssetReplace) {
                return (
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
                );
              }

              return (
                <div
                  key={ep.id}
                  className={[
                    "overflow-hidden rounded-lg border bg-surface/40",
                    isEditing ? "border-brand/40" : "border-border",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <div className="w-8 shrink-0 text-center text-xs font-bold text-brand">
                      E{ep.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-text">
                        {ep.title || "Untitled episode"}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-2xs text-text-muted">
                        {ep.runtime ? <span>{ep.runtime}</span> : <span>No runtime</span>}
                        {ep.isFree ? (
                          <span className="rounded-full bg-success/15 px-1.5 py-0.5 font-bold uppercase tracking-wider text-success">
                            Free
                          </span>
                        ) : null}
                        {ep.hlsMasterKey ? (
                          <span className="text-success">HLS ready</span>
                        ) : ep.slug ? (
                          <span>No HLS yet</span>
                        ) : (
                          <span className="text-warning">New · metadata only</span>
                        )}
                        {hasPendingAssets ? (
                          <span className="font-semibold text-brand">Changes pending save</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="ml-auto flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={isEditing ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => toggleEditEpisode(ep.id)}
                      >
                        {isEditing ? "Close" : "Edit"}
                      </Button>
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

                  {isEditing ? (
                    <div className="space-y-4 border-t border-border bg-bg/60 px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-2xs font-semibold text-text-disabled">
                            Title
                          </span>
                          <input
                            className={inputClass}
                            value={ep.title}
                            onChange={(e) =>
                              updateEpisode(season.id, ep.id, { title: e.target.value })
                            }
                            placeholder="Episode title"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-2xs font-semibold text-text-disabled">
                            Runtime
                          </span>
                          <input
                            className={inputClass}
                            value={ep.runtime}
                            onChange={(e) =>
                              updateEpisode(season.id, ep.id, { runtime: e.target.value })
                            }
                            placeholder="45m"
                          />
                        </label>
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted">
                        <input
                          type="checkbox"
                          checked={Boolean(ep.isFree)}
                          onChange={(e) =>
                            updateEpisode(season.id, ep.id, { isFree: e.target.checked })
                          }
                          className="rounded border-border"
                        />
                        Free episode
                      </label>

                      {canReplaceAssets ? (
                        <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
                          <div className="flex justify-center sm:justify-start">
                            <EpisodePosterThumb
                              posterFile={ep.posterFile}
                              posterUrl={ep.posterUrl}
                              title={ep.title}
                            />
                          </div>
                          <div>
                            <span className="block text-2xs font-semibold text-text-muted">
                              Replace video
                            </span>
                            <input
                              type="file"
                              accept="video/mp4,video/quicktime,video/*"
                              className={fileInputClass}
                              onChange={(e) =>
                                setEpisodeAsset(season.id, ep.id, "video", e.target.files)
                              }
                            />
                            {ep.videoFile ? (
                              <p className="mt-1 break-all text-2xs text-text-muted">
                                New: {ep.videoFile.name}
                              </p>
                            ) : ep.hlsMasterKey ? (
                              <p className="mt-1 text-2xs text-text-disabled">Current: HLS ready</p>
                            ) : (
                              <p className="mt-1 text-2xs text-text-disabled">
                                Optional — leave empty to keep current
                              </p>
                            )}
                          </div>
                          <div>
                            <span className="block text-2xs font-semibold text-text-muted">
                              Replace poster
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className={fileInputClass}
                              onChange={(e) =>
                                setEpisodeAsset(season.id, ep.id, "poster", e.target.files)
                              }
                            />
                            {ep.posterFile ? (
                              <p className="mt-1 break-all text-2xs text-text-muted">
                                New: {ep.posterFile.name}
                              </p>
                            ) : (
                              <p className="mt-1 text-2xs text-text-disabled">
                                Optional — leave empty to keep current
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-2xs text-warning">
                          New episode rows save metadata only. Upload video from Create series for
                          now.
                        </p>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingEpisodeId(null)}
                        >
                          Done editing
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
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
