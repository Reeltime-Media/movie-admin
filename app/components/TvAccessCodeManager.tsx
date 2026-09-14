"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { InlineLoading } from "./InlineLoading";
import { useTvAccessCodes } from "../hooks/adminQueries";
import {
  createAdminTvAccessCode,
  deleteAdminTvAccessCode,
  updateAdminTvAccessCode,
  type ApiTvAccessCode,
} from "../lib/api";
import { Button } from "./ui/Button";

type FormState = {
  label: string;
  code: string;
  expiresAt: string;
  isActive: boolean;
};

function defaultExpiryLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const emptyForm = (): FormState => ({
  label: "",
  code: "",
  expiresAt: defaultExpiryLocal(),
  isActive: true,
});

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function statusLabel(row: ApiTvAccessCode): string {
  if (!row.is_active) return "Inactive";
  if (row.is_expired) return "Expired";
  return "Active";
}

export function TvAccessCodeManager() {
  const { codesQuery, invalidate } = useTvAccessCodes();
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiTvAccessCode | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const codes = codesQuery.data ?? [];
  const isLoading = codesQuery.isLoading;
  const error = codesQuery.error
    ? codesQuery.error instanceof Error
      ? codesQuery.error.message
      : "Could not load TV access IDs."
    : null;

  useEffect(() => {
    if (!showForm) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) closeForm();
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showForm, isSaving]);

  const openCreateForm = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEditForm = (row: ApiTvAccessCode) => {
    setEditing(row);
    setForm({
      label: row.label ?? "",
      code: row.code,
      expiresAt: toLocalInput(row.expires_at),
      isActive: row.is_active,
    });
    setShowForm(true);
  };

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.expiresAt) {
      toast.error("Expiry date is required.");
      return;
    }
    const expiresAt = new Date(form.expiresAt).toISOString();

    setIsSaving(true);
    try {
      if (editing) {
        await updateAdminTvAccessCode(editing.id, {
          label: form.label.trim() || null,
          expiresAt,
          isActive: form.isActive,
        });
        toast.success("TV access ID updated.");
      } else {
        const created = await createAdminTvAccessCode({
          label: form.label.trim() || null,
          expiresAt,
          code: form.code.trim() || null,
          isActive: form.isActive,
        });
        toast.success(`TV ID created: ${created.code}`);
      }
      invalidate();
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save TV ID.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row: ApiTvAccessCode) => {
    if (!window.confirm(`Delete TV ID ${row.code}? This cannot be undone.`)) return;
    try {
      await deleteAdminTvAccessCode(row.id);
      toast.success("TV access ID deleted.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete TV ID.");
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("TV ID copied.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  return (
    <>
      <AdminCard
        title="TV access IDs"
        action="Create TV ID"
        actionIcon="plus"
        actionOnClick={openCreateForm}
      >
        <p className="mb-4 text-sm text-text-muted">
          Create an ID for a TV. Entering that ID on the TV app unlocks all movies,
          series, and Live TV until the expiry you set.
        </p>
        {isLoading ? (
          <InlineLoading label="Loading TV IDs…" />
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-text-muted">No TV access IDs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-2xs uppercase tracking-wide text-text-disabled">
                  <th className="pb-2 pr-3 font-semibold">TV ID</th>
                  <th className="pb-2 pr-3 font-semibold">Label</th>
                  <th className="pb-2 pr-3 font-semibold">Expires</th>
                  <th className="pb-2 pr-3 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((row) => (
                  <tr key={row.id} className="border-b border-border/70">
                    <td className="py-3 pr-3 font-mono text-sm font-semibold text-text">
                      {row.code}
                    </td>
                    <td className="py-3 pr-3 text-text-muted">{row.label || "—"}</td>
                    <td className="py-3 pr-3 text-text-muted">
                      {new Date(row.expires_at).toLocaleString()}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={
                          statusLabel(row) === "Active"
                            ? "text-emerald-600"
                            : "text-text-muted"
                        }
                      >
                        {statusLabel(row)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleCopy(row.code)}
                        >
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEditForm(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleDelete(row)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-text">
              {editing ? "Edit TV access ID" : "Create TV access ID"}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-text-muted">Label (optional)</span>
                <input
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Hotel lobby TV"
                />
              </label>
              {!editing ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-text-muted">
                    Custom TV ID (optional — auto-generated if empty)
                  </span>
                  <input
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm uppercase"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                    }
                    placeholder="TV-ABCD1234"
                  />
                </label>
              ) : (
                <div className="text-sm">
                  <span className="mb-1 block text-text-muted">TV ID</span>
                  <div className="font-mono font-semibold text-text">{form.code}</div>
                </div>
              )}
              <label className="block text-sm">
                <span className="mb-1 block text-text-muted">Expires at</span>
                <input
                  type="datetime-local"
                  required
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={closeForm}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : editing ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
