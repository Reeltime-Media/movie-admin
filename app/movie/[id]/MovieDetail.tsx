"use client";

import { useMemo, useState } from "react";
import { AdminCard } from "../../components/AdminCard";
import { Button } from "../../components/ui/Button";
import { AdminSectionTabs } from "../../components/AdminSectionTabs";
import { InlineLoading } from "../../components/InlineLoading";
import { statusClasses } from "../../lib/adminData";
import { regionLabel } from "../../lib/regions";
import { AdminContentHlsPlayer } from "../../components/AdminContentHlsPlayer";
import { AdminSourceVideoPlayer } from "../../components/AdminSourceVideoPlayer";
import { MovieCommentsAdmin } from "../MovieCommentsAdmin";
import { formatMovieDate, youtubeEmbedUrl } from "../movieDetailUi";
import { useAdminMovie } from "../../hooks/adminQueries";

type MovieTab = "overview" | "media" | "comments";

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

export function MovieDetail({ movieId }: { movieId: string }) {
  const { data: movie, isLoading, error: queryError, refetch } = useAdminMovie(movieId);
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Could not load movie detail"
    : null;
  const [tab, setTab] = useState<MovieTab>("overview");

  const trailerEmbedUrl = useMemo(() => youtubeEmbedUrl(movie?.trailerUrl), [movie?.trailerUrl]);

  if (isLoading) {
    return (
      <AdminCard title="Movie detail">
        <InlineLoading label="Loading movie detail" />
      </AdminCard>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
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

  if (!movie) {
    return (
      <AdminCard title="Movie not found">
        <p className="text-sm text-text-muted">
          This movie is not in the current admin catalog.
        </p>
        <Button href="/movie" variant="secondary" className="mt-4">
          Back to movie management
        </Button>
      </AdminCard>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "media", label: "Media" },
    { key: "comments", label: "Comments" },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <AdminSectionTabs
          tabs={tabs}
          active={tab}
          onChange={(k) => setTab(k as MovieTab)}
          bare
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-2">
          <Button href={`/movie/${movie.id}/edit`} size="sm">
            Edit movie
          </Button>
        </div>
      </div>

      {/* Active section */}
      <div>
          {tab === "overview" ? (
            <div className="min-h-[calc(100vh-13rem)] overflow-hidden rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  <InfoRow label="English title" value={movie.title} />
                  <InfoRow label="Khmer title" value={movie.titleKm || "—"} />
                  <InfoRow label="Region" value={regionLabel(movie.region)} />
                  <tr>
                    <th
                      scope="row"
                      className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
                    >
                      Status
                    </th>
                    <td className="px-5 py-3 align-top">
                      <span className={statusClasses(movie.status)}>{movie.status}</span>
                    </td>
                  </tr>
                  <InfoRow label="Type" value={movie.type} />
                  <InfoRow label="Genre" value={movie.genre} />
                  <InfoRow label="Price" value={movie.price} />
                  <InfoRow label="Rating" value={movie.rating} />
                  <InfoRow label="Watchers" value={(movie.watchCount ?? 0).toLocaleString()} />
                  <InfoRow
                    label="Purchases"
                    value={
                      movie.purchaseCount != null ? movie.purchaseCount.toLocaleString() : "—"
                    }
                  />
                  <InfoRow label="Runtime" value={movie.runtime} />
                  <InfoRow label="Release year" value={movie.releaseYear} />
                  <InfoRow label="Transcode" value={movie.transcodeStatus} />
                  <InfoRow label="Updated" value={formatMovieDate(movie.updatedAt)} />
                  <tr>
                    <th
                      scope="row"
                      className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
                    >
                      Description
                    </th>
                    <td className="px-5 py-3 align-top whitespace-pre-wrap leading-relaxed text-text-muted">
                      {movie.description || "No description has been added for this movie."}
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
                  <div className="mb-2 text-xs font-semibold text-text-muted">Poster</div>
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={`${movie.title} poster`}
                      className="aspect-2/3 w-40 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="grid aspect-2/3 w-40 place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
                      No poster
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold text-text-muted">Banner</div>
                  {movie.bannerUrl ? (
                    <img
                      src={movie.bannerUrl}
                      alt={`${movie.title} banner`}
                      className="w-full rounded-lg border border-border"
                    />
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
                      No banner
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold text-text-muted">
                    Original video (source.mp4)
                  </div>
                  <AdminSourceVideoPlayer contentId={movie.id} title={movie.title} />
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold text-text-muted">
                    Stream (HLS)
                  </div>
                  <AdminContentHlsPlayer
                    contentId={movie.id}
                    title={movie.title}
                    hasVideo={Boolean(movie.hlsMasterKey)}
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold text-text-muted">Trailer</div>
                  {trailerEmbedUrl ? (
                    <iframe
                      className="aspect-video w-full rounded-lg border border-border bg-black"
                      src={trailerEmbedUrl}
                      title={`${movie.title} trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : movie.trailerUrl ? (
                    <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center">
                      <Button
                        href={movie.trailerUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        size="sm"
                      >
                        Open trailer
                      </Button>
                    </div>
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
                      No trailer URL added.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "comments" ? (
            <div className="rounded-xl border border-border bg-surface p-6">
              <MovieCommentsAdmin key={movie.id} contentId={movie.id} embedded />
            </div>
          ) : null}
      </div>
    </div>
  );
}
