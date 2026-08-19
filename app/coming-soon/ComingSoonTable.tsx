"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { Button } from "../components/ui/Button";
import { statusClasses, type CatalogEntry } from "../lib/adminData";
import { validateMoviePublishReady } from "../lib/moviePublish";
import { toMovieDraft } from "../movie/movieEditHelpers";
import { formatMovieDate } from "../movie/movieDetailUi";

function videoStatusBadge(entry: CatalogEntry) {
  const base =
    "inline-flex items-center rounded-lg px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.1em] ring-1 ring-inset";
  if (entry.hlsMasterKey) {
    return <span className={`${base} bg-success/10 text-success ring-success/25`}>Ready</span>;
  }
  if (entry.transcodeStatus === "processing") {
    return <span className={`${base} bg-warning/10 text-warning ring-warning/25`}>Processing</span>;
  }
  return (
    <span className={`${base} bg-text-disabled/10 text-text-muted ring-text-disabled/25`}>
      Not uploaded
    </span>
  );
}

export function ComingSoonTable({
  entries,
  footer,
}: {
  entries: CatalogEntry[];
  footer?: React.ReactNode;
}) {
  const { deleteMovie, updateMovie } = useMovieCatalog();
  const [confirmDelete, setConfirmDelete] = useState<CatalogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const confirmRemove = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await deleteMovie(confirmDelete.id);
      toast.success("Coming soon movie deleted");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete movie");
    } finally {
      setIsDeleting(false);
    }
  };

  const publishNow = async (entry: CatalogEntry) => {
    const publishCheck = validateMoviePublishReady(entry);
    if (!publishCheck.ok) {
      toast.warning(publishCheck.message);
      return;
    }
    setPublishingId(entry.id);
    try {
      await updateMovie(entry.id, { ...toMovieDraft(entry), status: "Published" });
      toast.success(`${entry.title} published`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish movie");
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <>
      <section className="border border-border bg-surface">
        <div className="px-5 pb-5 pt-5">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-230 text-left text-sm">
              <thead>
                <tr className="border-b border-border text-2xs font-semibold uppercase tracking-[0.16em] text-text-disabled">
                  <th className="px-5 pb-2.5 font-semibold">Title</th>
                  <th className="px-5 pb-2.5 font-semibold">Release date</th>
                  <th className="px-5 pb-2.5 font-semibold">Video</th>
                  <th className="px-5 pb-2.5 font-semibold">Status</th>
                  <th className="px-5 pb-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-text-muted">
                      No coming soon movies yet.{" "}
                      <Link href="/movie/new" className="font-semibold text-brand hover:underline">
                        Add one
                      </Link>
                    </td>
                  </tr>
                ) : (
                  entries.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-surface-elevated">
                      <td className="p-0">
                        <Link
                          href={`/movie/${item.id}`}
                          className="flex max-w-72 items-center gap-3 px-5 py-3"
                        >
                          {item.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.posterUrl}
                              alt=""
                              className="h-14 w-10 shrink-0 rounded-md border border-border object-cover"
                            />
                          ) : (
                            <div className="grid h-14 w-10 shrink-0 place-items-center rounded-md border border-dashed border-border bg-bg text-2xs text-text-disabled">
                              —
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-medium text-text hover:text-brand">
                              {item.title}
                            </div>
                            {item.titleKm?.trim() ? (
                              <div className="truncate text-2xs text-text-muted">{item.titleKm}</div>
                            ) : null}
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-text-muted">
                        {item.releaseAt ? formatMovieDate(item.releaseAt) : "TBA"}
                      </td>
                      <td className="px-5 py-3">{videoStatusBadge(item)}</td>
                      <td className="px-5 py-3">
                        <span className={statusClasses(item.status)}>{item.status}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={publishingId === item.id}
                            onClick={() => void publishNow(item)}
                          >
                            Publish now
                          </Button>
                          <Button href={`/movie/${item.id}/edit`} variant="ghost" size="sm">
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
          aria-labelledby="delete-coming-soon-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-md">
            <h2 id="delete-coming-soon-title" className="text-lg font-bold tracking-[-0.02em]">
              Delete coming soon movie
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Remove <span className="font-bold text-text">{confirmDelete.title}</span> from the
              list? This cannot be undone from the console.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" loading={isDeleting} onClick={confirmRemove}>
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
