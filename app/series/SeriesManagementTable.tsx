"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { SeasonsEpisodesEditor } from "../components/SeasonsEpisodesEditor";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { statusClasses, type CatalogEntry, type Status } from "../lib/adminData";
import { adminDeleteButtonClass, adminDeleteConfirmButtonClass } from "../lib/adminUi";
import { formatGenres, parseGenresFromStored } from "../lib/genres";
import { seriesStructureSummary, validateSeriesSeasons } from "../lib/seriesHelpers";
import type { SeriesListFilter } from "./seriesListTypes";

const inputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated";

const selectClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors focus:border-border-hover focus:bg-surface-elevated";

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];

function SeriesFormFields({
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
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Description</span>
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          value={draft.description ?? ""}
          onChange={(e) => set("description", e.target.value || null)}
          placeholder="Brief synopsis shown on the series page…"
        />
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
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Rating</span>
        <input
          className={inputClass}
          value={draft.rating}
          onChange={(e) => set("rating", e.target.value)}
          placeholder="8.7"
        />
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">Genres</span>
        <GenreMultiSelect
          selected={parseGenresFromStored(draft.genre)}
          onChange={(next) => set("genre", formatGenres(next))}
        />
      </label>
      <div className="sm:col-span-2">
        <div className="mb-2 text-[12px] font-semibold text-text-muted">Seasons and episodes</div>
        <p className="mb-3 text-[11px] text-text-disabled">
          Episode video uploads are managed when creating a series or via the API. Structure edits
          here update season and episode metadata in the catalog.
        </p>
        <SeasonsEpisodesEditor
          seasons={draft.seasons}
          onChange={(next) => onChange({ ...draft, seasons: next })}
        />
      </div>
    </div>
  );
}

function toDraft(entry: CatalogEntry): Omit<CatalogEntry, "id"> {
  return {
    title: entry.title,
    description: entry.description,
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

export function SeriesManagementTable({
  entries,
  tableTitle = "All series",
  listFilter = "all",
  footer,
}: {
  entries: CatalogEntry[];
  tableTitle?: string;
  listFilter?: SeriesListFilter;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const { movies, updateMovie, deleteMovie } = useMovieCatalog();
  const [editing, setEditing] = useState<CatalogEntry | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<CatalogEntry, "id"> | null>(null);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CatalogEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openEdit = (item: CatalogEntry) => {
    setEditing(item);
    setEditSaveError(null);
    setEditDraft(structuredClone(toDraft(item)));
  };

  const closeEdit = () => {
    setEditing(null);
    setEditDraft(null);
    setEditSaveError(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editDraft) return;
    if (!editDraft.title.trim()) return;
    if (!editDraft.genre.trim()) return;
    if (!validateSeriesSeasons(editDraft.seasons)) {
      const message = "Series needs at least one season, and every episode needs a title.";
      setEditSaveError(message);
      toast.warning(message);
      return;
    }
    setEditSaveError(null);
    setIsSaving(true);
    try {
      await updateMovie(editing.id, editDraft);
      toast.success("Series updated successfully");
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
      toast.success("Series deleted");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete series");
    } finally {
      setIsDeleting(false);
    }
  };

  const seriesCount = movies.filter((m) => m.type === "Series").length;
  const emptyHint =
    seriesCount === 0 ? (
      <>
        No series yet.{" "}
        <Link href="/series/new" className="font-semibold text-brand hover:underline">
          Add a series
        </Link>
      </>
    ) : listFilter === "drafts" ? (
      "No draft series. Change the filter or set a series to Draft when editing."
    ) : (
      "No series to show."
    );

  return (
    <>
      <AdminCard title={tableTitle} flush>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-200 text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                <th className="px-5 pb-3 font-bold">Title</th>
                <th className="px-5 pb-3 font-bold">Structure</th>
                <th className="px-5 pb-3 font-bold">Genre</th>
                <th className="px-5 pb-3 font-bold">Status</th>
                <th className="px-5 pb-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-text-muted">
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
                    onClick={() => router.push(`/series/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/series/${item.id}`);
                      }
                    }}
                  >
                    <td className="p-0 font-bold">
                      <div className="px-5 py-4 transition-colors hover:text-brand">{item.title}</div>
                    </td>
                    <td className="px-5 py-4 text-text-muted">{seriesStructureSummary(item)}</td>
                    <td className="px-5 py-4 text-text-muted">{item.genre}</td>
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
                          className={adminDeleteButtonClass}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-series-title"
        >
          <form
            onSubmit={saveEdit}
            className="max-h-[90vh] w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-border bg-surface p-6 xl:max-w-[calc(100vw-4rem)]"
          >
            <h2 id="edit-series-title" className="text-[16px] font-bold tracking-[-0.02em]">
              Edit series
            </h2>
            <p className="mt-1 text-[12px] text-text-muted">{editing.title}</p>
            <div className="mt-5">
              <SeriesFormFields draft={editDraft} onChange={setEditDraft} />
            </div>
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
          aria-labelledby="delete-series-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
            <h2 id="delete-series-title" className="text-[16px] font-bold tracking-[-0.02em]">
              Delete series
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-text-muted">
              Remove <span className="font-bold text-text">{confirmDelete.title}</span> and all its
              seasons and episodes? This cannot be undone from the console.
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
                className={adminDeleteConfirmButtonClass}
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
