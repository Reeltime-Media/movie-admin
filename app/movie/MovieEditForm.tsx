"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminContentHlsPlayer } from "../components/AdminContentHlsPlayer";
import { AdminDownloadImageButton } from "../components/AdminDownloadImageButton";
import { AdminDownloadSourceButton } from "../components/AdminDownloadSourceButton";
import { AdminSectionTabs } from "../components/AdminSectionTabs";
import { AdminSourceVideoPlayer } from "../components/AdminSourceVideoPlayer";
import { AdminSelect } from "../components/AdminSelect";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/ui/Button";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { InlineLoading } from "../components/InlineLoading";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { useDeleteGenre, useGenres } from "../hooks/adminQueries";
import { uploadAdminMovieAssets } from "../lib/api";
import type { CatalogEntry, Status } from "../lib/adminData";
import { formatGenres, parseGenresFromStored } from "../lib/genres";
import { ADMIN_PRICE_HINT, validateAdminPriceUsd } from "../lib/money";
import {
  fromIctDatetimeLocalValue,
  toIctDatetimeLocalValue,
} from "../lib/datetimeIct";
import { validateMoviePublishReady } from "../lib/moviePublish";
import { REGION_OPTIONS } from "../lib/regions";
import {
  pickAssetFile,
  pickFileFromInput,
  toMovieDraft,
} from "./movieEditHelpers";
import { formatMovieDate, movieEditInputClass, movieFileInputClass, youtubeEmbedUrl } from "./movieDetailUi";

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];

const compactInputClass =
  "w-full rounded-lg border border-border bg-surface-elevated px-2 py-1.5 text-xs font-medium text-text outline-none transition-colors placeholder:text-text-disabled hover:border-border-hover focus:border-brand/50";

const compactSelectClass =
  "w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-semibold text-text outline-none transition-colors focus:border-border-hover";

function EditField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`.trim()}>
      <span className="mb-1 block text-2xs font-semibold uppercase tracking-[0.1em] text-text-disabled">
        {label}
      </span>
      {children}
    </label>
  );
}

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
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [tab, setTab] = useState<"overview" | "media">("overview");
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
  const editTrailerEmbedUrl = useMemo(
    () => youtubeEmbedUrl(editDraft?.trailerUrl),
    [editDraft?.trailerUrl],
  );

  const patchDraft = (patch: Partial<Omit<CatalogEntry, "id">>) => {
    setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // Poster/banner upload immediately on file selection rather than waiting
  // for the form's Save button — a separate upload-then-save round trip left
  // a window where "upload succeeded" but the page hadn't refreshed yet,
  // which read as "it didn't work" even once the underlying data was correct.
  const handlePosterFileChange = async (file: File | null) => {
    if (!movie || !file) {
      setEditPosterFile(null);
      return;
    }
    setEditPosterFile(file);
    setIsUploadingPoster(true);
    try {
      await uploadAdminMovieAssets(movie.id, { poster: file });
      await refreshMovies();
      setEditPosterFile(null);
      toast.success("Poster updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload poster.";
      toast.error(message, { toastId: "movie-poster-upload" });
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleBannerFileChange = async (file: File | null) => {
    if (!movie || !file) {
      setEditBannerFile(null);
      return;
    }
    setEditBannerFile(file);
    setIsUploadingBanner(true);
    try {
      await uploadAdminMovieAssets(movie.id, { banner: file });
      await refreshMovies();
      setEditBannerFile(null);
      toast.success("Banner updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not upload banner.";
      toast.error(message, { toastId: "movie-banner-upload" });
    } finally {
      setIsUploadingBanner(false);
    }
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
    if (!editDraft.title.trim()) {
      const message = "Enter a title to save.";
      setEditSaveError(message);
      toast.error(message, { toastId: "movie-edit-title" });
      return;
    }
    if (!editDraft.genre.trim()) {
      const message = "Select at least one genre.";
      setEditSaveError(message);
      toast.error(message, { toastId: "movie-edit-genre" });
      return;
    }

    const priceResult = validateAdminPriceUsd(editDraft.price);
    if (!priceResult.ok) {
      setEditSaveError(priceResult.message);
      toast.error(priceResult.message, { toastId: "movie-edit-price" });
      return;
    }

    if (editDraft.status === "Scheduled") {
      if (!editDraft.publishAt) {
        const message = "Pick a go-live date and time (Cambodia time) for Scheduled.";
        setEditSaveError(message);
        toast.error(message, { toastId: "movie-edit-schedule" });
        return;
      }
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
          videoFile: pickAssetFile(editVideoFile),
        },
      );
      if (!publishCheck.ok) {
        setEditSaveError(publishCheck.message);
        toast.error(publishCheck.message, { toastId: "movie-edit-publish" });
        return;
      }
    }

    // Poster/banner already upload (and save) themselves on file selection —
    // only video is still staged here for an explicit save, since it queues
    // a full re-transcode.
    const videoFile = pickAssetFile(editVideoFile);

    setEditSaveError(null);
    setIsSaving(true);
    try {
      if (videoFile) {
        setEditUploadProgress(0);
        await uploadAdminMovieAssets(movie.id, { video: videoFile }, setEditUploadProgress);
      }

      await updateMovie(movie.id, editDraft);
      if (videoFile) {
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
        <p className="text-sm text-warning">{error}</p>
        <button
          type="button"
          onClick={() => void refreshMovies()}
          className="mt-3 text-xs font-bold text-brand hover:underline"
        >
          Retry
        </button>
      </AdminCard>
    );
  }

  if (!movie || !editDraft) {
    return (
      <AdminCard title="Movie not found">
        <p className="text-sm text-text-muted">This movie is not in the admin catalog.</p>
        <BackButton href="/movie" label="Back to movies" className="mt-4" size="md" />
      </AdminCard>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "media", label: "Media" },
  ];

  return (
    <form onSubmit={saveEdit} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="pb-2">
            <BackButton href="/movie" label="Back" />
          </div>
          <AdminSectionTabs
            tabs={tabs}
            active={tab}
            onChange={(k) => setTab(k as "overview" | "media")}
            bare
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-2">
          <Button href={`/movie/${movie.id}`} variant="secondary" size="sm">
            Cancel
          </Button>
          <Button type="submit" variant="success" size="sm" loading={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className={tab === "overview" ? "block" : "hidden"}>
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-border pb-3 text-2xs text-text-muted">
            <span>
              Type <strong className="text-text">{editDraft.type}</strong>
            </span>
            <span>
              Watchers{" "}
              <strong className="text-text">{(movie.watchCount ?? 0).toLocaleString()}</strong>
            </span>
            <span>
              Transcode <strong className="text-text">{movie.transcodeStatus || "-"}</strong>
            </span>
            <span>
              Updated <strong className="text-text">{formatMovieDate(movie.updatedAt)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <EditField label="English title" className="sm:col-span-2">
              <input
                className={compactInputClass}
                value={editDraft.title}
                onChange={(e) => patchDraft({ title: e.target.value })}
                required
              />
            </EditField>
            <EditField label="Khmer title" className="sm:col-span-2">
              <input
                className={compactInputClass}
                value={editDraft.titleKm ?? ""}
                onChange={(e) => patchDraft({ titleKm: e.target.value })}
                placeholder="Optional"
              />
            </EditField>
            <EditField label="Region">
              <AdminSelect
                className={compactSelectClass}
                value={editDraft.region ?? ""}
                onChange={(v) => patchDraft({ region: v || null })}
                options={[{ value: "", label: "None" }, ...REGION_OPTIONS]}
                aria-label="Region"
              />
            </EditField>
            <EditField label="Status">
              <AdminSelect
                className={compactSelectClass}
                value={editDraft.status}
                onChange={(v) => {
                  const next = v as Status;
                  patchDraft({
                    status: next,
                    publishAt: next === "Scheduled" ? editDraft.publishAt ?? null : null,
                  });
                }}
                options={statuses.map((s) => ({ value: s, label: s }))}
                aria-label="Status"
              />
            </EditField>
            {editDraft.status === "Scheduled" ? (
              <EditField label="Go live (ICT)" className="sm:col-span-2">
                <input
                  type="datetime-local"
                  className={compactInputClass}
                  value={toIctDatetimeLocalValue(editDraft.publishAt)}
                  onChange={(e) =>
                    patchDraft({ publishAt: fromIctDatetimeLocalValue(e.target.value) })
                  }
                  required
                />
                <p className="mt-1 text-2xs text-text-disabled">
                  Cambodia time (UTC+7). Goes live when ready — retries if video is still
                  processing.
                </p>
              </EditField>
            ) : null}
            <EditField label="Genre" className="sm:col-span-2">
              <GenreMultiSelect
                selected={parseGenresFromStored(editDraft.genre)}
                onChange={(next) => patchDraft({ genre: formatGenres(next) })}
                options={genreOptions}
                onDeleteGenre={handleDeleteGenre}
              />
            </EditField>
            <EditField label="Price">
              <input
                className={compactInputClass}
                value={editDraft.price}
                onChange={(e) => patchDraft({ price: e.target.value })}
                placeholder="0, Free, or 2.99"
              />
              <p className="mt-1 text-2xs text-text-disabled">{ADMIN_PRICE_HINT}</p>
            </EditField>
            <EditField label="Rating">
              <input
                className={compactInputClass}
                value={editDraft.rating}
                onChange={(e) => patchDraft({ rating: e.target.value })}
                placeholder="8.7"
              />
            </EditField>
            <EditField label="Runtime (min)">
              <input
                className={compactInputClass}
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
                className={compactInputClass}
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
            <EditField label="Description" className="sm:col-span-2 lg:col-span-4">
              <textarea
                className={`${compactInputClass} min-h-24 resize-y font-normal`}
                value={editDraft.description ?? ""}
                onChange={(e) => patchDraft({ description: e.target.value || null })}
                placeholder="Brief synopsis shown on the movie page…"
              />
            </EditField>
          </div>
        </div>
      </div>

      <div className={tab === "media" ? "block" : "hidden"}>
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-text-muted">Poster</div>
                {!editPosterFile ? (
                  <AdminDownloadImageButton
                    url={movie.posterUrl}
                    filename={
                      movie.posterKey?.split("/").pop() ||
                      `${movie.slug || movie.id}-poster.jpg`
                    }
                    label="Download"
                  />
                ) : null}
              </div>
              {posterPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={posterPreviewUrl}
                  alt={`${movie.title} poster`}
                  className="aspect-2/3 w-40 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="grid aspect-2/3 w-40 place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
                  No poster
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className={movieFileInputClass}
                disabled={isUploadingPoster}
                onChange={(e) => handlePosterFileChange(pickFileFromInput(e.target.files))}
              />
              {isUploadingPoster ? (
                <p className="mt-2 text-2xs text-text-muted">Uploading…</p>
              ) : editPosterFile ? (
                <p className="mt-2 break-all text-2xs text-text-muted">
                  New file: {editPosterFile.name}
                </p>
              ) : (
                <p className="mt-2 break-all text-2xs text-text-disabled">
                  {movie.posterKey || "No poster uploaded"}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-text-muted">Banner</div>
                {!editBannerFile ? (
                  <AdminDownloadImageButton
                    url={movie.bannerUrl}
                    filename={
                      movie.bannerKey?.split("/").pop() ||
                      `${movie.slug || movie.id}-banner.jpg`
                    }
                    label="Download"
                  />
                ) : null}
              </div>
              {bannerPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerPreviewUrl}
                  alt={`${movie.title} banner`}
                  className="w-full rounded-lg border border-border"
                />
              ) : (
                <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
                  No banner
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className={movieFileInputClass}
                disabled={isUploadingBanner}
                onChange={(e) => handleBannerFileChange(pickFileFromInput(e.target.files))}
              />
              {isUploadingBanner ? (
                <p className="mt-2 text-2xs text-text-muted">Uploading…</p>
              ) : editBannerFile ? (
                <p className="mt-2 break-all text-2xs text-text-muted">
                  New file: {editBannerFile.name}
                </p>
              ) : (
                <p className="mt-2 break-all text-2xs text-text-disabled">
                  {movie.bannerKey || "No banner uploaded"}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-text-muted">
                  Original video (source.mp4)
                </div>
                {!editVideoFile ? (
                  <AdminDownloadSourceButton contentId={movie.id} label={movie.title} />
                ) : null}
              </div>
              {editVideoFile ? (
                <video
                  controls
                  className="aspect-video w-full rounded-lg border border-border bg-black"
                  src={editVideoPreviewUrl ?? undefined}
                />
              ) : (
                <AdminSourceVideoPlayer contentId={movie.id} title={movie.title} />
              )}
              <input
                type="file"
                accept="video/mp4,video/quicktime,application/x-mpegURL,video/*"
                className={movieFileInputClass}
                onChange={(e) => setEditVideoFile(pickFileFromInput(e.target.files))}
              />
              {editVideoFile ? (
                <p className="mt-2 break-all text-2xs text-text-muted">
                  New file: {editVideoFile.name} — saving will queue a fresh transcode.
                </p>
              ) : (
                <p className="mt-2 break-all text-2xs text-text-disabled">
                  {movie.slug ? `movies/${movie.slug}/source.mp4` : "No source uploaded"}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-text-muted">Stream (HLS)</div>
              <AdminContentHlsPlayer
                contentId={movie.id}
                title={movie.title}
                hasVideo={Boolean(movie.hlsMasterKey)}
              />
              {editUploadProgress !== null ? (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${editUploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-2xs text-text-muted">
                    Uploading video: {editUploadProgress}%
                  </p>
                </div>
              ) : (
                <p className="mt-2 break-all text-2xs text-text-disabled">
                  {movie.hlsMasterKey || "Not transcoded yet"}
                </p>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="mb-2 text-xs font-semibold text-text-muted">Trailer</div>
              <input
                className={`${movieEditInputClass} mb-3 font-normal`}
                type="url"
                value={editDraft.trailerUrl ?? ""}
                onChange={(e) => patchDraft({ trailerUrl: e.target.value || null })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {editTrailerEmbedUrl ? (
                <iframe
                  className="aspect-video w-full max-w-3xl rounded-lg border border-border bg-black"
                  src={editTrailerEmbedUrl}
                  title={`${movie.title} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : editDraft.trailerUrl ? (
                <div className="grid aspect-video max-w-3xl place-items-center rounded-lg border border-dashed border-border bg-bg text-center">
                  <Button
                    href={editDraft.trailerUrl}
                    target="_blank"
                    rel="noreferrer"
                    size="sm"
                  >
                    Open trailer
                  </Button>
                </div>
              ) : (
                <div className="grid aspect-video max-w-3xl place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
                  No trailer URL added.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editSaveError ? (
        <p className="text-xs font-semibold text-warning">{editSaveError}</p>
      ) : null}
    </form>
  );
}
