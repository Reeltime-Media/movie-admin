"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { InlineLoading } from "../components/InlineLoading";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { useDeleteGenre, useGenres } from "../hooks/adminQueries";
import { uploadAdminMovieAssets } from "../lib/api";
import type { CatalogEntry, Status } from "../lib/adminData";
import { formatGenres, parseGenresFromStored } from "../lib/genres";
import { ADMIN_PRICE_HINT, validateAdminPriceUsd } from "../lib/money";
import { validateMoviePublishReady } from "../lib/moviePublish";
import {
  pickAssetFile,
  pickFileFromInput,
  toMovieDraft,
} from "./movieEditHelpers";
import {
  EditField,
  formatMovieDate,
  movieEditInputClass,
  movieEditSelectClass,
  movieFileInputClass,
  youtubeEmbedUrl,
} from "./movieDetailUi";

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];

export function MovieEditForm({ movieId }: { movieId: string }) {
  const router = useRouter();
  const { movies, isLoading, error, updateMovie, refreshMovies } = useMovieCatalog();
  const movie = movies.find((item) => item.id === movieId && item.type === "Movie");

  const [editDraft, setEditDraft] = useState<Omit<CatalogEntry, "id"> | null>(null);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);
  const [editPosterFile, setEditPosterFile] = useState<File | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editUploadProgress, setEditUploadProgress] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [prevMovieId, setPrevMovieId] = useState<string | null>(null);
  const [prevMovieUpdatedAt, setPrevMovieUpdatedAt] = useState<string | null>(null);

  if (movie && (movie.id !== prevMovieId || movie.updatedAt !== prevMovieUpdatedAt)) {
    setPrevMovieId(movie.id);
    setPrevMovieUpdatedAt(movie.updatedAt ?? null);
    setEditDraft(structuredClone(toMovieDraft(movie)));
    setEditSaveError(null);
    setEditPosterFile(null);
    setEditBannerFile(null);
    setEditVideoFile(null);
    setEditUploadProgress(null);
  }

  const { data: genreData } = useGenres();
  const deleteGenreMutation = useDeleteGenre();
  const genreOptions = genreData?.map((g) => g.name);

  const handleDeleteGenre = (name: string) => {
    const genre = genreData?.find((g) => g.name === name);
    if (!genre) return;
    deleteGenreMutation.mutate(genre.id, {
      onSuccess: () => {
        if (editDraft) {
          patchDraft({ genre: formatGenres(parseGenresFromStored(editDraft.genre).filter((g) => g !== name)) });
        }
      },
      onError: () => toast.error("Could not delete genre"),
    });
  };

  const editPosterPreviewUrl = useMemo(
    () => (editPosterFile ? URL.createObjectURL(editPosterFile) : null),
    [editPosterFile],
  );
  const editBannerPreviewUrl = useMemo(
    () => (editBannerFile ? URL.createObjectURL(editBannerFile) : null),
    [editBannerFile],
  );
  const editVideoPreviewUrl = useMemo(
    () => (editVideoFile ? URL.createObjectURL(editVideoFile) : null),
    [editVideoFile],
  );
  const posterPreviewUrl = editPosterPreviewUrl ?? movie?.posterUrl ?? null;
  const bannerPreviewUrl = editBannerPreviewUrl ?? movie?.bannerUrl ?? null;
  const videoPreviewUrl = editVideoPreviewUrl ?? movie?.hlsMasterUrl ?? null;
  const editTrailerEmbedUrl = useMemo(
    () => youtubeEmbedUrl(editDraft?.trailerUrl),
    [editDraft?.trailerUrl],
  );

  const patchDraft = (patch: Partial<Omit<CatalogEntry, "id">>) => {
    setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  useEffect(() => {
    return () => {
      if (editPosterPreviewUrl) URL.revokeObjectURL(editPosterPreviewUrl);
    };
  }, [editPosterPreviewUrl]);

  useEffect(() => {
    return () => {
      if (editBannerPreviewUrl) URL.revokeObjectURL(editBannerPreviewUrl);
    };
  }, [editBannerPreviewUrl]);

  useEffect(() => {
    return () => {
      if (editVideoPreviewUrl) URL.revokeObjectURL(editVideoPreviewUrl);
    };
  }, [editVideoPreviewUrl]);

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movie || !editDraft) return;
    if (!editDraft.title.trim()) return;
    if (!editDraft.genre.trim()) return;

    const priceResult = validateAdminPriceUsd(editDraft.price);
    if (!priceResult.ok) {
      setEditSaveError(priceResult.message);
      toast.error(priceResult.message, { toastId: "movie-edit-price" });
      return;
    }

    const isNewlyPublishing =
      editDraft.status === "Published" && movie.status !== "Published";
    if (isNewlyPublishing) {
      const publishCheck = validateMoviePublishReady(
        {
          posterKey: movie.posterKey ?? editDraft.posterKey,
          hlsMasterKey: movie.hlsMasterKey ?? editDraft.hlsMasterKey,
          transcodeStatus: movie.transcodeStatus ?? editDraft.transcodeStatus,
        },
        {
          posterFile: pickAssetFile(editPosterFile),
          videoFile: pickAssetFile(editVideoFile),
        },
      );
      if (!publishCheck.ok) {
        setEditSaveError(publishCheck.message);
        toast.error(publishCheck.message, { toastId: "movie-edit-publish" });
        return;
      }
    }

    const posterFile = pickAssetFile(editPosterFile);
    const bannerFile = pickAssetFile(editBannerFile);
    const videoFile = pickAssetFile(editVideoFile);

    setEditSaveError(null);
    setIsSaving(true);
    try {
      const hasNewAssets = Boolean(posterFile || bannerFile || videoFile);
      if (hasNewAssets) {
        setEditUploadProgress(videoFile ? 0 : null);
        await uploadAdminMovieAssets(
          movie.id,
          { poster: posterFile, banner: bannerFile, video: videoFile },
          setEditUploadProgress,
        );
      }

      await updateMovie(movie.id, editDraft);
      if (hasNewAssets) {
        await refreshMovies();
      }
      toast.success("Movie updated successfully");
      router.push(`/movie/${movie.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save changes.";
      setEditSaveError(message);
      toast.error(message, { toastId: "movie-edit-save" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || (movie && !editDraft)) {
    return (
      <AdminCard title="Edit movie">
        <InlineLoading label="Loading movie" />
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard title="Edit movie">
        <p className="text-[13px] text-warning">{error}</p>
        <button
          type="button"
          onClick={() => void refreshMovies()}
          className="mt-3 text-[12px] font-bold text-brand hover:underline"
        >
          Retry
        </button>
      </AdminCard>
    );
  }

  if (!movie || !editDraft) {
    return (
      <AdminCard title="Movie not found">
        <p className="text-[13px] text-text-muted">This movie is not in the admin catalog.</p>
        <Link
          href="/movie"
          className="mt-4 inline-flex rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to movies
        </Link>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/movie/${movie.id}`}
            className="rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
          >
            Back to movie
          </Link>
          <Link
            href="/movie"
            className="rounded-md border border-border bg-bg px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
          >
            All movies
          </Link>
        </div>
      </div>

      <form onSubmit={saveEdit} className="overflow-hidden rounded-xl border border-border bg-surface">
        <header className="border-b border-border bg-surface-elevated px-6 py-6 md:px-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Edit movie</h2>
            <select
              className={`${movieEditSelectClass} w-auto min-w-32`}
              value={editDraft.status}
              onChange={(e) => patchDraft({ status: e.target.value as Status })}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <EditField label="Title">
              <input
                className={movieEditInputClass}
                value={editDraft.title}
                onChange={(e) => patchDraft({ title: e.target.value })}
                required
              />
            </EditField>
            <EditField label="Type">
              <span className="text-[13px] font-semibold text-text">{editDraft.type}</span>
            </EditField>
            <EditField label="Genre" className="sm:col-span-2 xl:col-span-1">
              <GenreMultiSelect
                selected={parseGenresFromStored(editDraft.genre)}
                onChange={(next) => patchDraft({ genre: formatGenres(next) })}
                options={genreOptions}
                onDeleteGenre={handleDeleteGenre}
              />
            </EditField>
            <EditField label="Price">
              <input
                className={movieEditInputClass}
                value={editDraft.price}
                onChange={(e) => patchDraft({ price: e.target.value })}
                placeholder="0, Free, or 2.99"
              />
              <p className="mt-1.5 text-[11px] text-text-disabled">{ADMIN_PRICE_HINT}</p>
            </EditField>
            <EditField label="Rating">
              <input
                className={movieEditInputClass}
                value={editDraft.rating}
                onChange={(e) => patchDraft({ rating: e.target.value })}
                placeholder="8.7"
              />
            </EditField>
            <EditField label="Runtime (minutes)">
              <input
                className={movieEditInputClass}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={editDraft.runtimeMinutes ?? ""}
                onChange={(e) =>
                  patchDraft({
                    runtimeMinutes: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="135"
              />
            </EditField>
            <EditField label="Release year">
              <input
                className={movieEditInputClass}
                type="number"
                min={1900}
                max={2100}
                value={editDraft.releaseYear ?? ""}
                onChange={(e) =>
                  patchDraft({
                    releaseYear: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="2024"
              />
            </EditField>
            <EditField label="Watchers">
              <span className="text-[13px] font-semibold text-text">
                {(movie.watchCount ?? 0).toLocaleString()}
              </span>
            </EditField>
            <EditField label="Transcode">
              <span className="text-[13px] font-semibold text-text">
                {movie.transcodeStatus || "-"}
              </span>
            </EditField>
            <EditField label="Updated">
              <span className="text-[13px] font-semibold text-text">
                {formatMovieDate(movie.updatedAt)}
              </span>
            </EditField>
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-text-disabled">
              Description
            </span>
            <textarea
              className={`${movieEditInputClass} min-h-20 resize-y font-normal`}
              value={editDraft.description ?? ""}
              onChange={(e) => patchDraft({ description: e.target.value || null })}
              placeholder="Brief synopsis shown on the movie page…"
            />
          </label>
        </header>

        <div className="grid gap-0 lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-border bg-bg p-5 lg:border-b-0 lg:border-r">
            <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Poster</div>
            {posterPreviewUrl ? (
              <img
                src={posterPreviewUrl}
                alt={`${movie.title} poster`}
                className="aspect-2/3 w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="grid aspect-2/3 place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[13px] text-text-muted">
                No poster available
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className={movieFileInputClass}
              onChange={(e) => setEditPosterFile(pickFileFromInput(e.target.files))}
            />
            {editPosterFile ? (
              <p className="mt-2 break-all text-[11px] text-text-muted">
                New file: {editPosterFile.name}
              </p>
            ) : (
              <p className="mt-2 break-all text-[11px] text-text-disabled">
                {movie.posterKey || "No poster uploaded"}
              </p>
            )}

            <div className="mb-3 mt-6 text-[16px] font-bold tracking-[-0.02em]">Banner</div>
            {bannerPreviewUrl ? (
              <img
                src={bannerPreviewUrl}
                alt={`${movie.title} banner`}
                className="aspect-video w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[13px] text-text-muted">
                No banner available
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className={movieFileInputClass}
              onChange={(e) => setEditBannerFile(pickFileFromInput(e.target.files))}
            />
            {editBannerFile ? (
              <p className="mt-2 break-all text-[11px] text-text-muted">
                New file: {editBannerFile.name}
              </p>
            ) : (
              <p className="mt-2 break-all text-[11px] text-text-disabled">
                {movie.bannerKey || "No banner uploaded"}
              </p>
            )}
          </aside>

          <main className="space-y-6 bg-bg p-5">
            <div>
              <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Video Preview</div>
              {videoPreviewUrl ? (
                <>
                  <video
                    controls
                    className="aspect-video w-full rounded-lg border border-border bg-black"
                    src={videoPreviewUrl}
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
              <input
                type="file"
                accept="video/mp4,video/quicktime,application/x-mpegURL,video/*"
                className={movieFileInputClass}
                onChange={(e) => setEditVideoFile(pickFileFromInput(e.target.files))}
              />
              {editVideoFile ? (
                <p className="mt-2 break-all text-[11px] text-text-muted">
                  New file: {editVideoFile.name} — saving will queue a fresh transcode.
                </p>
              ) : (
                <p className="mt-2 break-all text-[11px] text-text-disabled">
                  {movie.hlsMasterKey || "Not transcoded yet"}
                </p>
              )}
              {editUploadProgress !== null ? (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${editUploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Uploading video: {editUploadProgress}%
                  </p>
                </div>
              ) : null}
            </div>

            <div>
              <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">Trailer</div>
              <input
                className={`${movieEditInputClass} mb-3 font-normal`}
                type="url"
                value={editDraft.trailerUrl ?? ""}
                onChange={(e) => patchDraft({ trailerUrl: e.target.value || null })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {editTrailerEmbedUrl ? (
                <>
                  <iframe
                    className="aspect-video w-full rounded-lg border border-border bg-black"
                    src={editTrailerEmbedUrl}
                    title={`${movie.title} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {editDraft.trailerUrl ? (
                    <a
                      href={editDraft.trailerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-[12px] font-semibold text-brand hover:underline"
                    >
                      Open in new tab ↗
                    </a>
                  ) : null}
                </>
              ) : editDraft.trailerUrl ? (
                <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-surface text-center">
                  <div>
                    <p className="mb-3 text-[12px] text-text-muted">Non-YouTube trailer URL</p>
                    <a
                      href={editDraft.trailerUrl}
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

        {editSaveError ? (
          <p className="border-t border-border px-6 py-3 text-[12px] font-semibold text-warning">
            {editSaveError}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface-elevated px-6 py-4">
          <Link
            href={`/movie/${movie.id}`}
            className="rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
