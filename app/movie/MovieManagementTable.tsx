"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { SeasonsEpisodesEditor } from "../components/SeasonsEpisodesEditor";
import {
  completeAdminMovieAssetUpload,
  startAdminMovieAssetUpload,
  uploadFileToPresignedUrl,
} from "../lib/api";
import { TrailerPreview } from "../components/TrailerPreview";
import { statusClasses, type CatalogEntry, type Status } from "../lib/adminData";
import { formatGenres, parseGenresFromStored } from "../lib/genres";
import {
  defaultSeasons,
  validateSeriesSeasons,
} from "../lib/seriesHelpers";
import type { ListFilter } from "./movieListTypes";

const inputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated";

const selectClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors focus:border-border-hover focus:bg-surface-elevated";

const fileInputClass =
  "w-full rounded-md border border-dashed border-border bg-bg px-3 py-4 text-[12px] text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-[12px] file:font-bold file:text-white hover:border-border-hover";

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];


function MovieFormFields({
  draft,
  onChange,
}: {
  draft: Omit<CatalogEntry, "id">;
  onChange: (next: Omit<CatalogEntry, "id">) => void;
}) {
  const set = <K extends keyof Omit<CatalogEntry, "id">>(key: K, value: Omit<CatalogEntry, "id">[K]) => {
    onChange({ ...draft, [key]: value });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Title</span>
        <input
          className={inputClass}
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Type</span>
        <select
          className={selectClass}
          value={draft.type}
          onChange={(e) => {
            const t = e.target.value as CatalogEntry["type"];
            if (t === "Movie") {
              onChange({ ...draft, type: t, seasons: [] });
            } else {
              onChange({
                ...draft,
                type: t,
                seasons: draft.seasons.length > 0 ? draft.seasons : defaultSeasons(),
              });
            }
          }}
        >
          <option value="Movie">Movie</option>
          <option value="Series">Series</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Status</span>
        <select
          className={selectClass}
          value={draft.status}
          onChange={(e) => set("status", e.target.value as Status)}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Genres</span>
        <GenreMultiSelect
          selected={parseGenresFromStored(draft.genre)}
          onChange={(next) => set("genre", formatGenres(next))}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Price</span>
        <input
          className={inputClass}
          value={draft.price}
          onChange={(e) => set("price", e.target.value)}
          placeholder="$2.99 or Premium"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Views</span>
        <input
          className={inputClass}
          value={draft.views}
          onChange={(e) => set("views", e.target.value)}
          placeholder="82.4K"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Rating</span>
        <input
          className={inputClass}
          value={draft.rating}
          onChange={(e) => set("rating", e.target.value)}
          placeholder="8.7"
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">
          Trailer URL
        </span>
        <input
          className={inputClass}
          type="url"
          value={draft.trailerUrl ?? ""}
          onChange={(e) => set("trailerUrl", e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </label>
      {draft.type === "Series" ? (
        <div className="sm:col-span-2">
          <div className="mb-2 text-[12px] font-semibold text-text-muted">Seasons and episodes</div>
          <SeasonsEpisodesEditor
            seasons={draft.seasons}
            onChange={(next) => onChange({ ...draft, seasons: next })}
          />
        </div>
      ) : null}
    </div>
  );
}

function toDraft(entry: CatalogEntry): Omit<CatalogEntry, "id"> {
  return {
    title: entry.title,
    type: entry.type,
    price: entry.price,
    views: entry.views,
    rating: entry.rating,
    status: entry.status,
    genre: entry.genre,
    owner: entry.owner,
    trailerUrl: entry.trailerUrl,
    seasons: entry.seasons,
    seriesPosterFileName: entry.seriesPosterFileName,
  };
}

export function MovieManagementTable({
  entries,
  tableTitle = "All titles",
  listFilter = "all",
}: {
  entries: CatalogEntry[];
  tableTitle?: string;
  listFilter?: ListFilter;
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
    if (editDraft.type === "Series" && !validateSeriesSeasons(editDraft.seasons)) {
      const message = "Series needs at least one season, and every episode needs a title.";
      setEditSaveError(message);
      toast.warning(message);
      return;
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

  const emptyHint =
    movies.length === 0 ? (
      <>
        No titles yet.{" "}
        <Link href="/movie/new" className="font-semibold text-brand hover:underline">
          Add a title
        </Link>
      </>
    ) : listFilter === "movies" ? (
      "No movies match this view. Switch to All or Series, or add a movie."
    ) : listFilter === "series" ? (
      "No series match this view. Switch to All or Movies, or add a series."
    ) : listFilter === "drafts" ? (
      "No draft titles. Change the filter or set a title to Draft when editing."
    ) : (
      "No titles to show."
    );

  return (
    <>
      <AdminCard title={tableTitle}>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-230 text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                <th className="px-5 pb-3 font-bold">Title</th>
                <th className="px-5 pb-3 font-bold">Type</th>
                <th className="px-5 pb-3 font-bold">Genre</th>
                <th className="px-5 pb-3 font-bold">Price</th>
                <th className="px-5 pb-3 font-bold">Views</th>
                <th className="px-5 pb-3 font-bold">Status</th>
                <th className="px-5 pb-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[13px] text-text-muted">
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
                    <td className="px-5 py-4 text-text-muted">{item.type}</td>
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
      </AdminCard>

      {editing && editDraft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-movie-title"
        >
          <form
            onSubmit={saveEdit}
            className="max-h-[90vh] w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-2xl xl:max-w-[calc(100vw-4rem)]"
          >
            <h2 id="edit-movie-title" className="text-[16px] font-bold tracking-[-0.02em]">
              Edit title
            </h2>
            <p className="mt-1 text-[12px] text-text-muted">{editing.title}</p>
            <div className="mt-5">
              <MovieFormFields draft={editDraft} onChange={setEditDraft} />
            </div>
            {editing.type === "Movie" ? (
              <div className="mt-5 rounded-lg border border-border bg-bg p-4">
                <h3 className="text-[13px] font-bold text-text">Replace media</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
                  Choose a new poster or movie file only when you want to replace the existing asset.
                  Replacing the movie video will queue a fresh transcode job.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">
                      Poster image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className={fileInputClass}
                      onChange={(e) => setEditPosterFile(e.target.files?.[0] ?? null)}
                    />
                    <p className="mt-1 break-all text-[11px] text-text-disabled">
                      Current: {editing.posterKey || "none"}
                    </p>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">
                      Movie video
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,application/x-mpegURL,video/*"
                      className={fileInputClass}
                      onChange={(e) => setEditVideoFile(e.target.files?.[0] ?? null)}
                    />
                    <p className="mt-1 break-all text-[11px] text-text-disabled">
                      Current: {editing.hlsMasterKey || "not transcoded yet"}
                    </p>
                  </label>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
                  <div>
                    <div className="mb-1.5 text-[12px] font-semibold text-text-muted">
                      Poster preview
                    </div>
                    {posterPreviewUrl ? (
                      <div
                        className="aspect-2/3 rounded-lg border border-border bg-cover bg-center"
                        style={{ backgroundImage: `url(${posterPreviewUrl})` }}
                        aria-label={`${editing.title} poster preview`}
                        role="img"
                      />
                    ) : (
                      <div className="grid aspect-2/3 place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[12px] text-text-muted">
                        No poster preview
                      </div>
                    )}
                    {editPosterFile ? (
                      <p className="mt-1 break-all text-[11px] text-text-muted">
                        Selected: {editPosterFile.name}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <div className="mb-1.5 text-[12px] font-semibold text-text-muted">
                      Movie preview
                    </div>
                    {videoPreviewUrl ? (
                      <video
                        controls
                        className="aspect-video w-full rounded-lg border border-border bg-black"
                        src={videoPreviewUrl}
                      />
                    ) : (
                      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[12px] text-text-muted">
                        No video preview
                      </div>
                    )}
                    {editVideoFile ? (
                      <p className="mt-1 break-all text-[11px] text-text-muted">
                        Selected: {editVideoFile.name}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-text-disabled">
                        HLS playback may only preview in Safari until a web HLS player is added.
                      </p>
                    )}
                  </div>
                </div>
                <TrailerPreview url={editDraft.trailerUrl} />
                {editUploadProgress !== null ? (
                  <div className="mt-4">
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
            ) : null}
            {editSaveError ? (
              <p className="mt-3 text-[12px] font-semibold text-warning">{editSaveError}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
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
                className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
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
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl">
            <h2 id="delete-movie-title" className="text-[16px] font-bold tracking-[-0.02em]">
              Delete title
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
