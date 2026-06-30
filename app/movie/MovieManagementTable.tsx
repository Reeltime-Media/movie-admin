"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { statusClasses, type CatalogEntry } from "../lib/adminData";
import { adminDeleteButtonClass, adminDeleteConfirmButtonClass } from "../lib/adminUi";
import type { ListFilter } from "./movieListTypes";

export function MovieManagementTable({
  entries,
  listFilter = "all",
  footer,
}: {
  entries: CatalogEntry[];
  listFilter?: ListFilter;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const { movies, deleteMovie } = useMovieCatalog();
  const [confirmDelete, setConfirmDelete] = useState<CatalogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <section className="rounded-xl border border-border bg-surface">
        <div className="px-5 pb-5 pt-5">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-230 text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.1em] text-text-disabled">
                <th className="px-5 pb-3 font-bold">Title</th>
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
                        <Link
                          href={`/movie/${item.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md border border-border bg-bg px-2.5 py-1.5 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                        >
                          Edit
                        </Link>
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
        </div>
      </section>

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
                className={adminDeleteConfirmButtonClass}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
