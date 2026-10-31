"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { AdminMediaThumb } from "../components/AdminMediaThumb";
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
      <section>
          {entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-muted">{emptyHint}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {entries.map((item) => (
                <article
                  key={item.id}
                  className="group flex min-w-0 flex-col"
                >
                  <button
                    type="button"
                    className="relative block w-full cursor-pointer text-left"
                    onClick={() => router.push(`/movie/${item.id}`)}
                  >
                    <AdminMediaThumb
                      objectKey={item.posterKey}
                      srcUrl={item.posterUrl}
                      alt={`${item.title} poster`}
                      className="aspect-2/3 w-full rounded-lg border-0"
                      emptyLabel="No poster"
                    />
                    <span className="absolute left-2 top-2">
                      <span className={statusClasses(item.status)}>{item.status}</span>
                    </span>
                    <span className="pointer-events-none absolute inset-0 bg-linear-to-t rounded-lg from-black/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>

                  <div className="flex min-h-0 flex-1 flex-col gap-1.5 pt-2.5">
                    <button
                      type="button"
                      className="min-w-0 cursor-pointer text-left"
                      onClick={() => router.push(`/movie/${item.id}`)}
                    >
                      <h3 className="truncate text-sm font-semibold text-text transition-colors group-hover:text-brand">
                        {item.title}
                      </h3>
                      {item.titleKm?.trim() ? (
                        <p className="mt-0.5 truncate text-2xs text-text-muted">{item.titleKm}</p>
                      ) : null}
                      <p className="mt-1.5 truncate text-2xs text-text-muted">
                        {[item.genre, item.price, item.views ? `${item.views} views` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </button>

                    <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                      <Button
                        href={`/movie/${item.id}/edit`}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger-soft"
                        size="sm"
                        onClick={() => setConfirmDelete(item)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {footer}
      </section>

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-movie-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-md">
            <h2 id="delete-movie-title" className="text-lg font-semibold tracking-tight">
              Delete movie
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Remove <span className="font-semibold text-text">{confirmDelete.title}</span> from the
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
