"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { statusClasses, type CatalogEntry } from "../lib/adminData";
import { Button } from "../components/ui/Button";
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
      <section className="border border-border bg-surface">
        <div className="px-5 pb-5 pt-5">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-230 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-2xs font-semibold uppercase tracking-[0.16em] text-text-disabled">
                <th className="px-5 pb-2.5 font-semibold">Khmer title</th>
                <th className="px-5 pb-2.5 font-semibold">English title</th>
                <th className="px-5 pb-2.5 font-semibold">Genre</th>
                <th className="px-5 pb-2.5 text-right font-semibold">Price</th>
                <th className="px-5 pb-2.5 text-right font-semibold">Views</th>
                <th className="px-5 pb-2.5 font-semibold">Status</th>
                <th className="px-5 pb-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-text-muted">
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr
                    key={item.id}
                    role="link"
                    tabIndex={0}
                    className="group cursor-pointer transition-colors hover:bg-surface-elevated"
                    onClick={() => router.push(`/movie/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/movie/${item.id}`);
                      }
                    }}
                  >
                    <td className="p-0">
                      <div className="max-w-56 truncate px-5 py-3 font-medium text-text transition-colors group-hover:text-brand">
                        {item.titleKm?.trim() || "—"}
                      </div>
                    </td>
                    <td className="p-0">
                      <div className="max-w-56 truncate px-5 py-3 font-medium text-text transition-colors group-hover:text-brand">
                        {item.title}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{item.genre}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-text-muted">
                      {item.price}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-text-muted">
                      {item.views}
                    </td>
                    <td className="px-5 py-3">
                      <span className={statusClasses(item.status)}>{item.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          href={`/movie/${item.id}/edit`}
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
          aria-labelledby="delete-movie-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-md">
            <h2 id="delete-movie-title" className="text-lg font-bold tracking-[-0.02em]">
              Delete movie
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Remove <span className="font-bold text-text">{confirmDelete.title}</span> from the
              list? This cannot be undone from the console.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={isDeleting}
                onClick={confirmRemove}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
