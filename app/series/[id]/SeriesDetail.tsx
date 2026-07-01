"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Lock, PlayCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminCard } from "../../components/AdminCard";
import { AdminHlsPlayer } from "../../components/AdminHlsPlayer";
import { AdminSectionTabs } from "../../components/AdminSectionTabs";
import { InlineLoading } from "../../components/InlineLoading";
import { TrailerPreview } from "../../components/TrailerPreview";
import type { Episode } from "../../lib/adminData";
import { statusClasses } from "../../lib/adminData";
import { seriesStructureSummary, totalEpisodesInEntry } from "../../lib/seriesHelpers";
import { useAdminSeries } from "../../hooks/adminQueries";

type SeriesTab = "overview" | "media" | "episodes";

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <tr>
      <th
        scope="row"
        className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
      >
        {label}
      </th>
      <td className="px-5 py-3 align-top text-text">{value || "-"}</td>
    </tr>
  );
}

function episodeLabel(seasonNumber: number, ep: Episode) {
  return `S${seasonNumber}E${ep.number} · ${ep.title}`;
}

export function SeriesDetail({ seriesId }: { seriesId: string }) {
  const { data: series, isLoading, error: queryError, refetch } = useAdminSeries(seriesId);
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Could not load series detail"
    : null;
  const [tab, setTab] = useState<SeriesTab>("overview");
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

  const [prevPlayableEpisodes, setPrevPlayableEpisodes] = useState(playableEpisodes);
  const [prevSeriesId, setPrevSeriesId] = useState<string | null>(null);

  let currentSelectedEpisodeId = selectedEpisodeId;
  if (playableEpisodes !== prevPlayableEpisodes) {
    setPrevPlayableEpisodes(playableEpisodes);
    if (playableEpisodes.length === 0) {
      currentSelectedEpisodeId = null;
      setSelectedEpisodeId(null);
    } else if (!selectedEpisodeId || !playableEpisodes.some(({ ep }) => ep.id === selectedEpisodeId)) {
      currentSelectedEpisodeId = playableEpisodes[0].ep.id;
      setSelectedEpisodeId(playableEpisodes[0].ep.id);
    }
  }

  if (series && series.id !== prevSeriesId) {
    setPrevSeriesId(series.id);
    setExpandedSeasons(new Set(series.seasons.map((s) => s.id)));
  }

  const selected = (() => {
    if (!currentSelectedEpisodeId) return null;
    for (const { season, ep } of playableEpisodes) {
      if (ep.id === currentSelectedEpisodeId) return { season, ep };
    }
    return null;
  })();

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
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 font-bold hover:underline"
        >
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
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "media", label: "Media" },
    { key: "episodes", label: "Episodes", badge: episodeCount },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <AdminSectionTabs
          tabs={tabs}
          active={tab}
          onChange={(k) => setTab(k as SeriesTab)}
          bare
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-2">
          <Link
            href={`/series/${series.id}/edit`}
            className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Edit series
          </Link>
        </div>
      </div>

      {/* Active section */}
      <div>
          {tab === "overview" ? (
            <div className="min-h-[calc(100vh-13rem)] overflow-hidden rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-[13px]">
                <tbody className="divide-y divide-border">
                  <InfoRow label="Title" value={series.title} />
                  <tr>
                    <th
                      scope="row"
                      className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
                    >
                      Status
                    </th>
                    <td className="px-5 py-3 align-top">
                      <span className={statusClasses(series.status)}>{series.status}</span>
                    </td>
                  </tr>
                  <InfoRow label="Structure" value={seriesStructureSummary(series)} />
                  <InfoRow label="Episodes" value={episodeCount} />
                  <InfoRow label="Genre" value={series.genre} />
                  <InfoRow label="Rating" value={series.rating} />
                  <InfoRow label="Release year" value={series.releaseYear} />
                  <InfoRow label="Updated" value={formatDate(series.updatedAt)} />
                  <tr>
                    <th
                      scope="row"
                      className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
                    >
                      Description
                    </th>
                    <td className="px-5 py-3 align-top whitespace-pre-wrap leading-relaxed text-text-muted">
                      {series.description || "No description has been added for this series."}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === "media" ? (
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-[12px] font-semibold text-text-muted">Poster</div>
                  {series.posterUrl ? (
                    <img
                      src={series.posterUrl}
                      alt={`${series.title} poster`}
                      className="aspect-2/3 w-40 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="grid aspect-2/3 w-40 place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-[12px] text-text-muted">
                      No poster
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-[12px] font-semibold text-text-muted">Banner</div>
                  {series.bannerUrl ? (
                    <img
                      src={series.bannerUrl}
                      alt={`${series.title} banner`}
                      className="w-full rounded-lg border border-border"
                    />
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-[12px] text-text-muted">
                      No banner
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-[12px] font-semibold text-text-muted">Trailer</div>
                  {series.trailerUrl ? (
                    <TrailerPreview url={series.trailerUrl} />
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-[12px] text-text-muted">
                      No trailer URL added.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "episodes" ? (
            <div className="space-y-6 rounded-xl border border-border bg-surface p-6">
              <div>
                <div className="mb-3 text-[14px] font-bold tracking-[-0.02em]">Episode preview</div>
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
                  <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg px-4 text-center text-[13px] text-text-muted">
                    {playableEpisodes.length === 0
                      ? "No transcoded episode video yet. Upload and transcode episodes to preview them here."
                      : "Select an episode with a ready video to preview."}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-6">
                <div className="mb-3 text-[14px] font-bold tracking-[-0.02em]">Seasons and episodes</div>
                {series.seasons.length === 0 ? (
                  <p className="text-[13px] text-text-muted">No seasons configured yet.</p>
                ) : (
                  series.seasons.map((season) => {
                    const isOpen = expandedSeasons.has(season.id);
                    return (
                      <div
                        key={season.id}
                        className="mb-3 overflow-hidden rounded-md border border-border bg-bg last:mb-0"
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
            </div>
          ) : null}
      </div>
    </div>
  );
}
