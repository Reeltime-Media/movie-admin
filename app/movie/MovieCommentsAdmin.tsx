"use client";

import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminPagination } from "../components/AdminPagination";
import {
  deleteAdminComment,
  listAdminComments,
  updateAdminComment,
  type ApiComment,
} from "../lib/api";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Field";
import { formatMovieDate } from "./movieDetailUi";

const COMMENTS_PAGE_SIZE = 5;

type MovieCommentsAdminProps = {
  contentId: string;
  /** Render inline without the collapsible card chrome (for use inside a tab panel). */
  embedded?: boolean;
};

export function MovieCommentsAdmin({ contentId, embedded = false }: MovieCommentsAdminProps) {
  const [open, setOpen] = useState(embedded);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCount = useCallback(async () => {
    try {
      const res = await listAdminComments(contentId, { page: 1, pageSize: 1 });
      setTotal(res.total);
      setPages(res.pages);
    } catch {
      /* badge only — ignore */
    }
  }, [contentId]);

  const loadPage = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listAdminComments(contentId, {
          page: targetPage,
          pageSize: COMMENTS_PAGE_SIZE,
        });
        setComments(res.items);
        setTotal(res.total);
        setPage(res.page);
        setPages(res.pages);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load comments");
      } finally {
        setLoading(false);
      }
    },
    [contentId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCount();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCount]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      void loadPage(page);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, page, loadPage]);

  function startEdit(comment: ApiComment) {
    setEditingId(comment.id);
    setEditBody(comment.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  async function saveEdit(commentId: string) {
    const trimmed = editBody.trim();
    if (!trimmed) return;
    setBusyId(commentId);
    try {
      const updated = await updateAdminComment(commentId, trimmed);
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update comment");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    setBusyId(commentId);
    try {
      await deleteAdminComment(commentId);
      const nextTotal = Math.max(0, total - 1);
      const nextPages = Math.max(1, Math.ceil(nextTotal / COMMENTS_PAGE_SIZE));
      const nextPage = page > nextPages ? nextPages : page;
      setTotal(nextTotal);
      setPages(nextPages);
      if (open) {
        await loadPage(nextPage);
      } else {
        setPage(nextPage);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete comment");
    } finally {
      setBusyId(null);
    }
  }

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next) setPage(1);
      return next;
    });
  }

  const body = loading ? (
    <div className="flex h-24 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
    </div>
  ) : error ? (
    <div className="space-y-2">
      <p className="text-sm text-warning">{error}</p>
      <button
        type="button"
        onClick={() => void loadPage(page)}
        className="text-xs font-bold text-brand hover:underline"
      >
        Retry
      </button>
    </div>
  ) : comments.length === 0 ? (
    <p className="text-sm text-text-muted">No comments on this movie yet.</p>
  ) : (
    <>
      <ul className="space-y-4">
        {comments.map((comment) => {
          const isEditing = editingId === comment.id;
          const isBusy = busyId === comment.id;
          return (
            <li key={comment.id} className="rounded-lg border border-border bg-bg p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-text">
                    {comment.author.display_name}
                  </p>
                  <p className="text-2xs text-text-muted">
                    {formatMovieDate(comment.created_at)}
                    {comment.updated_at !== comment.created_at
                      ? ` · edited ${formatMovieDate(comment.updated_at)}`
                      : null}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => startEdit(comment)}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="danger-soft"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => void handleDelete(comment.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    maxLength={2000}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy || !editBody.trim()}
                      onClick={() => void saveEdit(comment.id)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                  {comment.body}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <AdminPagination
        inset={embedded ? "none" : "panel"}
        page={page}
        pages={pages}
        total={total}
        pageSize={COMMENTS_PAGE_SIZE}
        isLoading={loading}
        onPageChange={setPage}
      />
    </>
  );

  if (embedded) {
    return (
      <div>
        {total > 0 ? (
          <p className="mb-4 text-xs text-text-muted">
            {total} comment{total === 1 ? "" : "s"}
          </p>
        ) : null}
        {body}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-surface-elevated"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          {open ? (
            <ChevronDown size={16} className="shrink-0 text-text-muted" aria-hidden />
          ) : (
            <ChevronRight size={16} className="shrink-0 text-text-muted" aria-hidden />
          )}
          <MessageSquare size={16} className="text-brand" aria-hidden />
          <h3 className="text-lg font-bold tracking-[-0.02em]">User comments</h3>
          {total > 0 ? (
            <span className="rounded-full bg-bg px-2 py-0.5 text-2xs font-semibold text-text-muted">
              {total}
            </span>
          ) : null}
        </div>
        <span className="text-xs font-semibold text-text-muted">
          {open ? "Collapse" : "Expand"}
        </span>
      </button>

      {open ? <div className="border-t border-border px-6 pb-6 pt-4">{body}</div> : null}
    </section>
  );
}
