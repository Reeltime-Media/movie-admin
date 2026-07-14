"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminContentHlsPlayer } from "../components/AdminContentHlsPlayer";
import { AdminSectionTabs } from "../components/AdminSectionTabs";
import { AdminSourceVideoPlayer } from "../components/AdminSourceVideoPlayer";
import { AdminSelect } from "../components/AdminSelect";
import { Button } from "../components/ui/Button";
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
  formatMovieDate,
  movieEditInputClass,
  movieEditSelectClass,
  movieFileInputClass,
  youtubeEmbedUrl,
} from "./movieDetailUi";

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th
        scope="row"
        className="w-44 px-5 py-3 text-left align-top font-semibold text-text-muted"
      >
        {label}
      </th>
      <td className="px-5 py-3 align-top">{children}</td>
    </tr>
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
        <Button href="/movie" variant="secondary" className="mt-4">
          Back to movies
        </Button>
      </AdminCard>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "media", label: "Media" },
  ];

  return (
    <form onSubmit={saveEdit} className="space-y-5">
      {/* Tabs + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <AdminSectionTabs
          tabs={tabs}
          active={tab}
          onChange={(k) => setTab(k as "overview" | "media")}
          bare
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-2">
          <Button href={`/movie/${movie.id}`} variant="secondary" size="sm">
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Active section */}
      <div>
          <div className={tab === "overview" ? "block" : "hidden"}>
            <div className="min-h-[calc(100vh-13rem)] rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  <EditRow label="Title">
                    <input
                      className={movieEditInputClass}
                      value={editDraft.title}
                      onChange={(e) => patchDraft({ title: e.target.value })}
                      required
                    />
                  </EditRow>
                  <EditRow label="Status">
                    <AdminSelect
                      className={movieEditSelectClass}
                      value={editDraft.status}
                      onChange={(v) => patchDraft({ status: v as Status })}
                      options={statuses.map((s) => ({ value: s, label: s }))}
                      aria-label="Status"
                    />
                  </EditRow>
                  <EditRow label="Type">
                    <span className="font-semibold text-text">{editDraft.type}</span>
                  </EditRow>
                  <EditRow label="Genre">
                    <GenreMultiSelect
                      selected={parseGenresFromStored(editDraft.genre)}
                      onChange={(next) => patchDraft({ genre: formatGenres(next) })}
                      options={genreOptions}
                      onDeleteGenre={handleDeleteGenre}
                    />
                  </EditRow>
                  <EditRow label="Price">
                    <input
                      className={movieEditInputClass}
                      value={editDraft.price}
                      onChange={(e) => patchDraft({ price: e.target.value })}
                      placeholder="0, Free, or 2.99"
                    />
                    <p className="mt-1.5 text-2xs text-text-disabled">{ADMIN_PRICE_HINT}</p>
                  </EditRow>
                  <EditRow label="Rating">
                    <input
                      className={movieEditInputClass}
                      value={editDraft.rating}
                      onChange={(e) => patchDraft({ rating: e.target.value })}
                      placeholder="8.7"
                    />
                  </EditRow>
                  <EditRow label="Runtime (minutes)">
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
                  </EditRow>
                  <EditRow label="Release year">
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
                  </EditRow>
                  <EditRow label="Watchers">
                    <span className="font-semibold text-text">
                      {(movie.watchCount ?? 0).toLocaleString()}
                    </span>
                  </EditRow>
                  <EditRow label="Transcode">
                    <span className="font-semibold text-text">
                      {movie.transcodeStatus || "-"}
                    </span>
                  </EditRow>
                  <EditRow label="Updated">
                    <span className="font-semibold text-text">
                      {formatMovieDate(movie.updatedAt)}
                    </span>
                  </EditRow>
                  <EditRow label="Description">
                    <textarea
                      className={`${movieEditInputClass} min-h-20 resize-y font-normal`}
                      value={editDraft.description ?? ""}
                      onChange={(e) => patchDraft({ description: e.target.value || null })}
                      placeholder="Brief synopsis shown on the movie page…"
                    />
                  </EditRow>
                </tbody>
              </table>
            </div>
          </div>

          <div className={tab === "media" ? "block" : "hidden"}>
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold text-text-muted">Poster</div>
                  {posterPreviewUrl ? (
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
                    onChange={(e) => setEditPosterFile(pickFileFromInput(e.target.files))}
                  />
                  {editPosterFile ? (
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
                  <div className="mb-2 text-xs font-semibold text-text-muted">Banner</div>
                  {bannerPreviewUrl ? (
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
                    onChange={(e) => setEditBannerFile(pickFileFromInput(e.target.files))}
                  />
                  {editBannerFile ? (
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
                  <div className="mb-2 text-xs font-semibold text-text-muted">
                    Original video (source.mp4)
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
                  <div className="mb-2 text-xs font-semibold text-text-muted">
                    Stream (HLS)
                  </div>
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

                <div>
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
                      className="aspect-video w-full rounded-lg border border-border bg-black"
                      src={editTrailerEmbedUrl}
                      title={`${movie.title} trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : editDraft.trailerUrl ? (
                    <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center">
                      <Button
                        href={editDraft.trailerUrl ?? "#"}
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
          </div>
      </div>

      {editSaveError ? (
        <p className="text-xs font-semibold text-warning">{editSaveError}</p>
      ) : null}
    </form>
  );
}
