"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { AdminCard } from "../../components/AdminCard";
import { LoadingOverlay } from "../../components/LoadingOverlay";
import { useMovieCatalog } from "../../components/MovieCatalogProvider";
import { statusClasses } from "../../lib/adminData";
import { MovieCommentsAdmin } from "../MovieCommentsAdmin";
import { DetailRow, formatMovieDate, youtubeEmbedUrl } from "../movieDetailUi";

export function MovieDetail({ movieId }: { movieId: string }) {
  const router = useRouter();
  const { movies, isLoading, error, refreshMovies } = useMovieCatalog();
  const entry = movies.find((item) => item.id === movieId);
  const movie = entry?.type === "Movie" ? entry : undefined;

  useEffect(() => {
    if (!isLoading && entry?.type === "Series") {
      router.replace(`/series/${entry.id}`);
    }
  }, [isLoading, entry, router]);

  const trailerEmbedUrl = useMemo(() => youtubeEmbedUrl(movie?.trailerUrl), [movie?.trailerUrl]);

  if (isLoading) {
    return <LoadingOverlay open label="Loading movie detail" />;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/movie"
          className="rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to movies
        </Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <header className="border-b border-border bg-surface-elevated px-6 py-6 md:px-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Movie metadata</h2>
            <span className={statusClasses(movie.status)}>{movie.status}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Title" value={movie.title} />
            <DetailRow label="Type" value={movie.type} />
            <DetailRow label="Genre" value={movie.genre} />
            <DetailRow label="Price" value={movie.price} />
            <DetailRow label="Rating" value={movie.rating} />
            <DetailRow
              label="Watchers"
              value={(movie.watchCount ?? 0).toLocaleString()}
            />
            <DetailRow label="Runtime" value={movie.runtime} />
            <DetailRow label="Release year" value={movie.releaseYear} />
            <DetailRow label="Transcode" value={movie.transcodeStatus} />
            <DetailRow label="Updated" value={formatMovieDate(movie.updatedAt)} />
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-text-muted">
            {movie.description || "No description has been added for this movie."}
          </p>
        </header>

        <div className="grid gap-0 lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-border bg-bg p-5 lg:border-b-0 lg:border-r">
            <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Poster</div>
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={`${movie.title} poster`}
                className="aspect-2/3 w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="grid aspect-2/3 place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[13px] text-text-muted">
                No poster available
              </div>
            )}
          </aside>

          <main className="space-y-6 bg-bg p-5">
            <div>
              <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Video Preview</div>
              {movie.hlsMasterUrl ? (
                <>
                  <video
                    controls
                    className="aspect-video w-full rounded-lg border border-border bg-black"
                    src={movie.hlsMasterUrl}
                  />
                  <p className="mt-2 text-[12px] text-text-muted">
                    HLS playback works natively in Safari. Chrome may require a player integration.
                  </p>
                </>
              ) : (
                <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[13px] text-text-muted">
                  No transcoded video yet.
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Trailer</div>
              {trailerEmbedUrl ? (
                <>
                  <iframe
                    className="aspect-video w-full rounded-lg border border-border bg-black"
                    src={trailerEmbedUrl}
                    title={`${movie.title} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {movie.trailerUrl ? (
                    <a
                      href={movie.trailerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-[12px] font-semibold text-brand hover:underline"
                    >
                      Open in new tab ↗
                    </a>
                  ) : null}
                </>
              ) : movie.trailerUrl ? (
                <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-surface text-center">
                  <div>
                    <p className="mb-3 text-[12px] text-text-muted">Non-YouTube trailer URL</p>
                    <a
                      href={movie.trailerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
                    >
                      Open trailer
                    </a>
                  </div>
                </div>
              ) : (
                <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[13px] text-text-muted">
                  No trailer URL added.
                </div>
              )}
            </div>
          </main>
        </div>
      </section>

      <MovieCommentsAdmin contentId={movie.id} />
    </div>
  );
}
