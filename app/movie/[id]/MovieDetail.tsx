"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminCard } from "../../components/AdminCard";
import { AdminSectionTabs } from "../../components/AdminSectionTabs";
import { InlineLoading } from "../../components/InlineLoading";
import { useMovieCatalog } from "../../components/MovieCatalogProvider";
import { statusClasses } from "../../lib/adminData";
import { AdminHlsPlayer } from "../../components/AdminHlsPlayer";
import { MovieCommentsAdmin } from "../MovieCommentsAdmin";
import { formatMovieDate, youtubeEmbedUrl } from "../movieDetailUi";

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
  const router = useRouter();
  const { movies, isLoading, error, refreshMovies } = useMovieCatalog();
  const entry = movies.find((item) => item.id === movieId);
  const movie = entry?.type === "Movie" ? entry : undefined;
  const [tab, setTab] = useState<MovieTab>("overview");

  useEffect(() => {
    if (!isLoading && entry?.type === "Series") {
      router.replace(`/series/${entry.id}`);
    }
  }, [isLoading, entry, router]);

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
      <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-[13px] text-warning">
        <p>{error}</p>
        <button type="button" onClick={refreshMovies} className="mt-3 font-bold hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!movie) {
    return (
      <AdminCard title="Movie not found">
        <p className="text-[13px] text-text-muted">
          This movie is not in the current admin catalog.
        </p>
        <Link
          href="/movie"
          className="mt-4 inline-flex rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to movie management
        </Link>
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
          <Link
            href={`/movie/${movie.id}/edit`}
            className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Edit movie
          </Link>
        </div>
      </div>

      {/* Active section */}
      <div>
          {tab === "overview" ? (
            <div className="min-h-[calc(100vh-13rem)] overflow-hidden rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-[13px]">
                <tbody className="divide-y divide-border">
                  <InfoRow label="Title" value={movie.title} />
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
                  <div className="mb-2 text-[12px] font-semibold text-text-muted">Poster</div>
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={`${movie.title} poster`}
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
                  {movie.bannerUrl ? (
                    <img
                      src={movie.bannerUrl}
                      alt={`${movie.title} banner`}
                      className="w-full rounded-lg border border-border"
                    />
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-[12px] text-text-muted">
                      No banner
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-[12px] font-semibold text-text-muted">Video</div>
                  {movie.hlsMasterUrl ? (
                    <AdminHlsPlayer src={movie.hlsMasterUrl} title={movie.title} />
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-[12px] text-text-muted">
                      No transcoded video yet.
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-[12px] font-semibold text-text-muted">Trailer</div>
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
                      <a
                        href={movie.trailerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
                      >
                        Open trailer
                      </a>
                    </div>
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-[12px] text-text-muted">
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
