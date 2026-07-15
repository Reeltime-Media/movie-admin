"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { statusClasses, type CatalogEntry } from "../lib/adminData";
import { Button } from "../components/ui/Button";
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
      <section className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="px-5 pb-5 pt-5">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-200 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-2xs uppercase tracking-widest text-text-disabled">
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
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-text-muted">
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr
                    key={item.id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-surface-elevated"
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
                        <Button
                          href={`/series/${item.id}/edit`}
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger-soft"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(item);
                          }}
                        >
                          Delete
                        </Button>
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
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-md">
            <h2 id="delete-series-title" className="text-lg font-bold tracking-[-0.02em]">
              Delete series
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Remove <span className="font-bold text-text">{confirmDelete.title}</span> and all its
              seasons and episodes? This cannot be undone from the console.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" loading={isDeleting} onClick={confirmRemove}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
