"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { statusClasses, type CatalogEntry } from "../lib/adminData";
import { adminDeleteButtonClass, adminDeleteConfirmButtonClass } from "../lib/adminUi";
import { seriesStructureSummary } from "../lib/seriesHelpers";
import type { SeriesListFilter } from "./seriesListTypes";

export function SeriesManagementTable({
  entries,
  listFilter = "all",
  footer,
}: {
  entries: CatalogEntry[];
  listFilter?: SeriesListFilter;
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
      <section className="rounded-xl border border-border bg-surface">
        <div className="px-5 pb-5 pt-5">
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
                        <Link
                          href={`/series/${item.id}/edit`}
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
