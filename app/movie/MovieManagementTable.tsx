"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import {
  completeAdminMovieAssetUpload,
  startAdminMovieAssetUpload,
  uploadFileToPresignedUrl,
} from "../lib/api";
import { statusClasses, type CatalogEntry, type Status } from "../lib/adminData";
import { formatGenres, parseGenresFromStored } from "../lib/genres";
import type { ListFilter } from "./movieListTypes";
import { ADMIN_PRICE_HINT, validateAdminPriceUsd } from "../lib/money";
import { validateMoviePublishReady } from "../lib/moviePublish";
import {
  EditField,
  formatMovieDate,
  movieEditInputClass,
  movieEditSelectClass,
  movieFileInputClass,
  youtubeEmbedUrl,
} from "./movieDetailUi";

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];

function toDraft(entry: CatalogEntry): Omit<CatalogEntry, "id"> {
  return {
    title: entry.title,
    description: entry.description,
    type: entry.type,
    price: entry.price,
    views: entry.views,
    rating: entry.rating,
    runtime: entry.runtime,
    runtimeMinutes: entry.runtimeMinutes,
    releaseYear: entry.releaseYear,
    status: entry.status,
    genre: entry.genre,
    owner: entry.owner,
    trailerUrl: entry.trailerUrl,
    transcodeStatus: entry.transcodeStatus,
    watchCount: entry.watchCount,
    updatedAt: entry.updatedAt,
    seasons: entry.seasons,
    seriesPosterFileName: entry.seriesPosterFileName,
  };
}

export function MovieManagementTable({
  entries,
  tableTitle = "All titles",
  listFilter = "all",
  footer,
}: {
  entries: CatalogEntry[];
  tableTitle?: string;
  listFilter?: ListFilter;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const { movies, updateMovie, deleteMovie, refreshMovies } = useMovieCatalog();
  const [editing, setEditing] = useState<CatalogEntry | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<CatalogEntry, "id"> | null>(null);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);
  const [editPosterFile, setEditPosterFile] = useState<File | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editUploadProgress, setEditUploadProgress] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CatalogEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const editPosterPreviewUrl = useMemo(
    () => (editPosterFile ? URL.createObjectURL(editPosterFile) : null),
    [editPosterFile],
  );
  const editVideoPreviewUrl = useMemo(
    () => (editVideoFile ? URL.createObjectURL(editVideoFile) : null),
    [editVideoFile],
  );
  const posterPreviewUrl = editPosterPreviewUrl ?? editing?.posterUrl ?? null;
  const videoPreviewUrl = editVideoPreviewUrl ?? editing?.hlsMasterUrl ?? null;
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
      if (editVideoPreviewUrl) URL.revokeObjectURL(editVideoPreviewUrl);
    };
  }, [editVideoPreviewUrl]);

  const openEdit = (item: CatalogEntry) => {
    setEditing(item);
    setEditSaveError(null);
    setEditDraft(structuredClone(toDraft(item)));
    setEditPosterFile(null);
    setEditVideoFile(null);
    setEditUploadProgress(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditDraft(null);
    setEditSaveError(null);
    setEditPosterFile(null);
    setEditVideoFile(null);
    setEditUploadProgress(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editDraft) return;
    if (!editDraft.title.trim()) return;
    if (!editDraft.genre.trim()) return;
    const priceResult = validateAdminPriceUsd(editDraft.price);
    if (!priceResult.ok) {
      setEditSaveError(priceResult.message);
      toast.error(priceResult.message);
      return;
    }
    if (editDraft.status === "Published") {
      const publishCheck = validateMoviePublishReady(editDraft, {
        posterFile: editPosterFile,
        videoFile: editVideoFile,
      });
      if (!publishCheck.ok) {
        setEditSaveError(publishCheck.message);
        toast.error(publishCheck.message);
        return;
      }
    }

    setEditSaveError(null);
    setIsSaving(true);
    try {
      await updateMovie(editing.id, editDraft);
      if (editPosterFile || editVideoFile) {
        setEditUploadProgress(editVideoFile ? 0 : null);
        const upload = await startAdminMovieAssetUpload(editing.id, {
          videoContentType: editVideoFile?.type || undefined,
          posterContentType: editPosterFile?.type || undefined,
        });

        if (editPosterFile && upload.poster_upload_url) {
          await uploadFileToPresignedUrl(upload.poster_upload_url, editPosterFile);
        }

        if (editVideoFile && upload.video_upload_url) {
          await uploadFileToPresignedUrl(upload.video_upload_url, editVideoFile, setEditUploadProgress);
        }

        await completeAdminMovieAssetUpload(editing.id, {
          sourceKey: upload.source_key,
          posterKey: upload.poster_key,
        });
        await refreshMovies();
      }
      toast.success("Movie updated successfully");
      closeEdit();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save changes.";
      setEditSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await deleteMovie(confirmDelete.id);
      toast.success("Movie deleted");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete movie");
    } finally {
      setIsDeleting(false);
    }
  };

  const movieCount = movies.filter((m) => m.type === "Movie").length;
  const emptyHint =
    movieCount === 0 ? (
      <>
        No movies yet.{" "}
        <Link href="/movie/new" className="font-semibold text-brand hover:underline">
          Add a movie
        </Link>
      </>
    ) : listFilter === "drafts" ? (
      "No draft movies. Change the filter or set a movie to Draft when editing."
    ) : (
      "No movies to show."
    );

  return (
    <>
      <AdminCard title={tableTitle} flush>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-230 text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                <th className="px-5 pb-3 font-bold">Title</th>
                <th className="px-5 pb-3 font-bold">Genre</th>
                <th className="px-5 pb-3 font-bold">Price</th>
                <th className="px-5 pb-3 font-bold">Watchers</th>
                <th className="px-5 pb-3 font-bold">Status</th>
                <th className="px-5 pb-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[13px] text-text-muted">
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr
                    key={item.id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer text-[13px] transition-colors hover:bg-surface-elevated"
                    onClick={() => router.push(`/movie/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/movie/${item.id}`);
                      }
                    }}
                  >
                    <td className="p-0 font-bold">
                      <div className="px-5 py-4 transition-colors hover:text-brand">{item.title}</div>
                    </td>
                    <td className="px-5 py-4 text-text-muted">{item.genre}</td>
                    <td className="px-5 py-4 text-text-muted">{item.price}</td>
                    <td className="px-5 py-4 text-text-muted">{item.views}</td>
                    <td className="px-5 py-4">
                      <span className={statusClasses(item.status)}>{item.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(item);
                          }}
                          className="rounded-md border border-border bg-bg px-2.5 py-1.5 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(item);
                          }}
                          className="rounded-md border border-border bg-bg px-2.5 py-1.5 text-[11px] font-semibold text-warning transition-colors hover:border-warning hover:bg-warning/10"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {footer}
      </AdminCard>

      {editing && editDraft ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-bg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-movie-title"
        >
          <form
            onSubmit={saveEdit}
            className="flex h-full w-full flex-col overflow-hidden bg-surface"
          >
            <div className="flex-1 overflow-y-auto">
              <section className="overflow-hidden">
                <header className="border-b border-border bg-surface-elevated px-6 py-6 md:px-10">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="edit-movie-title" className="text-[18px] font-extrabold tracking-[-0.02em]">
                      Movie metadata
                    </h2>
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
                      />
                    </EditField>
                    <EditField label={editDraft.type === "Series" ? "Monthly price" : "Price"}>
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
                            runtimeMinutes: e.target.value
                              ? Number(e.target.value)
                              : null,
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
                        {(editing.watchCount ?? 0).toLocaleString()}
                      </span>
                    </EditField>
                    <EditField label="Transcode">
                      <span className="text-[13px] font-semibold text-text">
                        {editing.transcodeStatus || "-"}
                      </span>
                    </EditField>
                    <EditField label="Updated">
                      <span className="text-[13px] font-semibold text-text">
                        {formatMovieDate(editing.updatedAt)}
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
                        alt={`${editing.title} poster`}
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
                      onChange={(e) => setEditPosterFile(e.target.files?.[0] ?? null)}
                    />
                    {editPosterFile ? (
                      <p className="mt-2 break-all text-[11px] text-text-muted">
                        New file: {editPosterFile.name}
                      </p>
                    ) : (
                      <p className="mt-2 break-all text-[11px] text-text-disabled">
                        {editing.posterKey || "No poster uploaded"}
                      </p>
                    )}
                  </aside>

                  <main className="space-y-6 bg-bg p-5">
                    <div>
                      <div className="mb-3 text-[16px] font-bold tracking-[-0.02em]">
                        Video Preview
                      </div>
                      {videoPreviewUrl ? (
                        <>
                          <video
                            controls
                            className="aspect-video w-full rounded-lg border border-border bg-black"
                            src={videoPreviewUrl}
                          />
                          <p className="mt-2 text-[12px] text-text-muted">
                            HLS playback works natively in Safari. Chrome may require a player
                            integration.
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
                        onChange={(e) => setEditVideoFile(e.target.files?.[0] ?? null)}
                      />
                      {editVideoFile ? (
                        <p className="mt-2 break-all text-[11px] text-text-muted">
                          New file: {editVideoFile.name} — saving will queue a fresh transcode.
                        </p>
                      ) : (
                        <p className="mt-2 break-all text-[11px] text-text-disabled">
                          {editing.hlsMasterKey || "Not transcoded yet"}
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
                            title={`${editing.title} trailer`}
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
              </section>
            </div>

            {editSaveError ? (
              <p className="border-t border-border px-6 py-3 text-[12px] font-semibold text-warning">
                {editSaveError}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface-elevated px-6 py-4">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-movie-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <h2 id="delete-movie-title" className="text-[16px] font-bold tracking-[-0.02em]">
              Delete movie
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-text-muted">
              Remove <span className="font-bold text-text">{confirmDelete.title}</span> from the
              list? This cannot be undone from the console.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={isDeleting}
                className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
