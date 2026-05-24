"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Lock, PlayCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminCard } from "../../components/AdminCard";
import { AdminHlsPlayer } from "../../components/AdminHlsPlayer";
import { InlineLoading } from "../../components/InlineLoading";
import { useMovieCatalog } from "../../components/MovieCatalogProvider";
import type { Episode } from "../../lib/adminData";
import { statusClasses } from "../../lib/adminData";
import { seriesStructureSummary, totalEpisodesInEntry } from "../../lib/seriesHelpers";

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md border border-border bg-bg p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-disabled">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-semibold text-text">{value || "-"}</div>
    </div>
  );
}

function episodeLabel(seasonNumber: number, ep: Episode) {
  return `S${seasonNumber}E${ep.number} · ${ep.title}`;
}

export function SeriesDetail({ seriesId }: { seriesId: string }) {
  const { movies, isLoading, error, refreshMovies } = useMovieCatalog();
  const series = movies.find((item) => item.id === seriesId && item.type === "Series");
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  const playableEpisodes = useMemo(() => {
    if (!series) return [];
    return series.seasons.flatMap((season) =>
      season.episodes
        .filter((ep) => ep.hlsMasterUrl)
        .map((ep) => ({ season, ep })),
    );
  }, [series]);

  const selected = useMemo(() => {
    if (!selectedEpisodeId) return null;
    for (const { season, ep } of playableEpisodes) {
      if (ep.id === selectedEpisodeId) return { season, ep };
    }
    return null;
  }, [playableEpisodes, selectedEpisodeId]);

  useEffect(() => {
    if (playableEpisodes.length === 0) {
      setSelectedEpisodeId(null);
      return;
    }
    if (!selectedEpisodeId || !playableEpisodes.some(({ ep }) => ep.id === selectedEpisodeId)) {
      setSelectedEpisodeId(playableEpisodes[0].ep.id);
    }
  }, [playableEpisodes, selectedEpisodeId]);

  useEffect(() => {
    if (!series) return;
    setExpandedSeasons(new Set(series.seasons.map((s) => s.id)));
  }, [series?.id]);

  function toggleSeason(id: string) {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <AdminCard title="Series detail">
        <InlineLoading label="Loading series detail" />
      </AdminCard>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-[13px] text-warning">
        <p>{error}</p>
        <button type="button" onClick={refreshMovies} className="mt-3 font-bold hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!series) {
    return (
      <AdminCard title="Series not found">
        <p className="text-[13px] text-text-muted">
          This series is not in the current admin catalog.
        </p>
        <Link
          href="/series"
          className="mt-4 inline-flex rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to series management
        </Link>
      </AdminCard>
    );
  }

  const episodeCount = totalEpisodesInEntry(series);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/series"
          className="rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to series
        </Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <header className="border-b border-border bg-surface-elevated px-6 py-6 md:px-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Series metadata</h2>
            <span className={statusClasses(series.status)}>{series.status}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Title" value={series.title} />
            <DetailRow label="Structure" value={seriesStructureSummary(series)} />
            <DetailRow label="Episodes" value={episodeCount} />
            <DetailRow label="Genre" value={series.genre} />
            <DetailRow label="Rating" value={series.rating} />
            <DetailRow label="Release year" value={series.releaseYear} />
            <DetailRow label="Updated" value={formatDate(series.updatedAt)} />
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-text-muted">
            {series.description || "No description has been added for this series."}
          </p>
        </header>

        <div className="grid gap-0 lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-border bg-bg p-5 lg:border-b-0 lg:border-r">
            <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Poster</div>
            {series.posterUrl ? (
              <img
                src={series.posterUrl}
                alt={`${series.title} poster`}
                className="aspect-2/3 w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="grid aspect-2/3 place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[13px] text-text-muted">
                No poster available
              </div>
            )}
          </aside>

          <main className="space-y-5 bg-bg p-5">
            <div>
              <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Episode preview</div>
              {selected?.ep.hlsMasterUrl ? (
                <>
                  <p className="mb-2 text-[12px] font-semibold text-text-muted">
                    {episodeLabel(selected.season.number, selected.ep)}
                  </p>
                  <AdminHlsPlayer
                    key={selected.ep.id}
                    src={selected.ep.hlsMasterUrl}
                    title={selected.ep.title}
                  />
                  <p className="mt-2 text-[12px] text-text-muted">
                    Select an episode below to switch playback. Requires{" "}
                    <code className="text-[11px]">NEXT_PUBLIC_R2_PUBLIC_URL</code> for stream URLs.
                  </p>
                </>
              ) : (
                <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-surface px-4 text-center text-[13px] text-text-muted">
                  {playableEpisodes.length === 0
                    ? "No transcoded episode video yet. Upload and transcode episodes to preview them here."
                    : "Select an episode with a ready video to preview."}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Seasons and episodes</div>
              {series.seasons.length === 0 ? (
                <p className="text-[13px] text-text-muted">No seasons configured yet.</p>
              ) : (
                series.seasons.map((season) => {
                  const isOpen = expandedSeasons.has(season.id);
                  return (
                    <div
                      key={season.id}
                      className="mb-3 overflow-hidden rounded-md border border-border bg-surface last:mb-0"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSeason(season.id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-elevated"
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? (
                            <ChevronDown size={14} className="text-text-muted" />
                          ) : (
                            <ChevronRight size={14} className="text-text-muted" />
                          )}
                          <span className="text-[14px] font-bold">
                            Season {season.number} · {season.episodes.length} episode
                            {season.episodes.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </button>
                      {isOpen ? (
                        <ul className="divide-y divide-border/50 border-t border-border">
                          {season.episodes.map((ep) => {
                            const isReady = Boolean(ep.hlsMasterUrl);
                            const isSelected = ep.id === selectedEpisodeId;
                            return (
                              <li key={ep.id}>
                                <button
                                  type="button"
                                  disabled={!isReady}
                                  onClick={() => isReady && setSelectedEpisodeId(ep.id)}
                                  className={[
                                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                    isSelected ? "bg-brand/10" : "hover:bg-surface-elevated",
                                    !isReady ? "cursor-not-allowed opacity-70" : "",
                                  ].join(" ")}
                                >
                                  <span className="w-5 shrink-0 text-center text-[13px] font-bold tabular-nums text-brand">
                                    {ep.number}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                                    {ep.title}
                                  </span>
                                  {ep.runtime ? (
                                    <span className="shrink-0 text-[11px] text-text-disabled">
                                      {ep.runtime}
                                    </span>
                                  ) : null}
                                  {ep.isFree ? (
                                    <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                                      Free
                                    </span>
                                  ) : null}
                                  <span className="shrink-0">
                                    {isReady ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                                        <PlayCircle size={12} />
                                        {isSelected ? "playing" : "ready"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-disabled">
                                        <Lock size={12} />
                                        no video
                                      </span>
                                    )}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
