"use client";

import { useMemo, useState } from "react";
import { AdminCard } from "../../components/AdminCard";
import { AdminMediaThumb } from "../../components/AdminMediaThumb";
import { BackButton } from "../../components/BackButton";
import { Button } from "../../components/ui/Button";
import { AdminSectionTabs } from "../../components/AdminSectionTabs";
import { InlineLoading } from "../../components/InlineLoading";
import { statusClasses } from "../../lib/adminData";
import { regionLabel } from "../../lib/regions";
import { AdminContentHlsPlayer } from "../../components/AdminContentHlsPlayer";
import { AdminDownloadSourceButton } from "../../components/AdminDownloadSourceButton";
import { AdminSourceVideoPlayer } from "../../components/AdminSourceVideoPlayer";
import { MovieCommentsAdmin } from "../MovieCommentsAdmin";
import { formatMovieDate, youtubeEmbedUrl } from "../movieDetailUi";
import { useAdminMovie } from "../../hooks/adminQueries";

type MovieTab = "overview" | "media" | "comments";

function FactChip({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="rounded-lg border border-border bg-bg/70 px-3 py-2">
      <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}

function MediaBlock({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-[0.14em] text-text-muted">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
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
        <BackButton href="/movie" label="Back to movies" className="mt-4" size="md" />
      </AdminCard>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "media", label: "Media" },
    { key: "comments", label: "Comments" },
  ];

  const heroImage = movie.bannerUrl || movie.posterUrl;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-surface">
        <div className="absolute inset-0">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin CDN hosts vary
            <img
              src={heroImage}
              alt=""
              className="h-full w-full object-cover opacity-35"
            />
          ) : (
            <div className="h-full w-full bg-surface-elevated" />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-bg via-bg/90 to-bg/55" />
          <div className="absolute inset-0 bg-linear-to-t from-bg via-transparent to-bg/40" />
        </div>

        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:p-6">
          <AdminMediaThumb
            objectKey={movie.posterKey}
            srcUrl={movie.posterUrl}
            alt={`${movie.title} poster`}
            className="aspect-2/3 w-28 shrink-0 shadow-lg sm:w-36"
            emptyLabel="No poster"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={statusClasses(movie.status)}>{movie.status}</span>
              {movie.genre ? (
                <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {movie.genre}
                </span>
              ) : null}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-text sm:text-3xl">
                {movie.title}
              </h2>
              {movie.titleKm?.trim() ? (
                <p className="mt-1 text-sm text-text-muted">{movie.titleKm}</p>
              ) : null}
            </div>
            <p className="text-sm text-text-muted">
              {[movie.price, movie.runtime, movie.releaseYear]
                .filter((v) => v != null && v !== "")
                .join(" · ")}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <BackButton href="/movie" label="Back to movies" />
              <Button href={`/movie/${movie.id}/edit`} size="sm">
                Edit movie
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <AdminSectionTabs
          tabs={tabs}
          active={tab}
          onChange={(k) => setTab(k as MovieTab)}
          bare
        />
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <AdminCard title="Description">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                {movie.description || "No description has been added for this movie."}
              </p>
            </AdminCard>
            <AdminCard title="Details">
              <div className="grid gap-2 sm:grid-cols-2">
                <FactChip label="Region" value={regionLabel(movie.region)} />
                <FactChip label="Rating" value={movie.rating} />
                <FactChip label="Release year" value={movie.releaseYear} />
                <FactChip label="Runtime" value={movie.runtime} />
                <FactChip label="Transcode" value={movie.transcodeStatus} />
                <FactChip label="Updated" value={formatMovieDate(movie.updatedAt)} />
              </div>
            </AdminCard>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <AdminCard title="Performance">
              <div className="grid gap-3">
                <div className="rounded-lg border border-border bg-bg/70 px-4 py-3">
                  <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Watchers
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-text">
                    {(movie.watchCount ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg/70 px-4 py-3">
                  <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Purchases
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-text">
                    {movie.purchaseCount != null
                      ? movie.purchaseCount.toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg/70 px-4 py-3">
                  <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Views (catalog)
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-text">
                    {movie.views || "—"}
                  </p>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
      ) : null}

      {tab === "media" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <MediaBlock title="Poster">
            {movie.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
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
          </MediaBlock>

          <MediaBlock title="Banner">
            {movie.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={movie.bannerUrl}
                alt={`${movie.title} banner`}
                className="w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
                No banner
              </div>
            )}
          </MediaBlock>

          <MediaBlock
            title="Original video (source.mp4)"
            action={<AdminDownloadSourceButton contentId={movie.id} label={movie.title} />}
          >
            <AdminSourceVideoPlayer contentId={movie.id} title={movie.title} />
          </MediaBlock>

          <MediaBlock title="Stream (HLS)">
            <AdminContentHlsPlayer
              contentId={movie.id}
              title={movie.title}
              hasVideo={Boolean(movie.hlsMasterKey)}
            />
          </MediaBlock>

          <MediaBlock title="Trailer">
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
                <Button href={movie.trailerUrl} target="_blank" rel="noreferrer" size="sm">
                  Open trailer
                </Button>
              </div>
            ) : (
              <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
                No trailer URL added.
              </div>
            )}
          </MediaBlock>
        </div>
      ) : null}

      {tab === "comments" ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <MovieCommentsAdmin key={movie.id} contentId={movie.id} embedded />
        </div>
      ) : null}
    </div>
  );
}
