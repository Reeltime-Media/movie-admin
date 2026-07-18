"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { InlineLoading } from "./InlineLoading";
import { SortableList, persistReorderedSort } from "./SortableList";
import {
  createAdminPromotionBanner,
  deleteAdminPromotionBanner,
  listAdminPromotionBanners,
  startAdminPromotionBannerImageUpload,
  updateAdminPromotionBanner,
  uploadFileToPresignedUrl,
  type ApiPromotionBanner,
} from "../lib/api";
import { Button } from "./ui/Button";
import { mediaUrl } from "../lib/media";
import { queryKeys } from "../lib/queryKeys";

type BannerFormState = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  placement: string;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
};

const emptyForm = (): BannerFormState => ({
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "/pricing",
  placement: "home",
  isActive: true,
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
});

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function PromotionBannerManager() {
  const queryClient = useQueryClient();
  const bannersQuery = useQuery({
    queryKey: queryKeys.promotionBanners,
    queryFn: listAdminPromotionBanners,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<ApiPromotionBanner | null>(null);
  const [form, setForm] = useState<BannerFormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const banners = bannersQuery.data ?? [];
  const isLoading = bannersQuery.isLoading;
  const error = bannersQuery.error
    ? bannersQuery.error instanceof Error
      ? bannersQuery.error.message
      : "Could not load promotion banners."
    : null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.promotionBanners });
  };

  const updateImageFile = (file: File | null) => {
    setImageFile(file);
    setImagePreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  };

  // Revoke the last object URL if the component unmounts while a preview is set.
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingBanner(null);
    setForm(emptyForm());
    updateImageFile(null);
  }, []);

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
  }, [showForm, isSaving, closeForm]);

  const openCreateForm = () => {
    setEditingBanner(null);
    setForm(emptyForm());
    updateImageFile(null);
    setShowForm(true);
  };

  const openEditForm = (banner: ApiPromotionBanner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      ctaLabel: banner.cta_label ?? "",
      ctaHref: banner.cta_href ?? "",
      placement: banner.placement,
      isActive: banner.is_active,
      sortOrder: String(banner.sort_order),
      startsAt: toDatetimeLocalValue(banner.starts_at),
      endsAt: toDatetimeLocalValue(banner.ends_at),
    });
    updateImageFile(null);
    setShowForm(true);
  };

  const uploadBannerImage = async (bannerId: string, file: File) => {
    const start = await startAdminPromotionBannerImageUpload(bannerId, file.type);
    await uploadFileToPresignedUrl(start.upload_url, file);
    await updateAdminPromotionBanner(bannerId, { imageKey: start.image_key });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    const ctaHref = form.ctaHref.trim();
    if (ctaHref && (!ctaHref.startsWith("/") || ctaHref.startsWith("//"))) {
      toast.error("Button link must be a site path starting with / (e.g. /pricing).");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        ctaLabel: form.ctaLabel.trim() || null,
        ctaHref: ctaHref || null,
        placement: form.placement.trim() || "home",
        isActive: form.isActive,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        startsAt: fromDatetimeLocalValue(form.startsAt),
        endsAt: fromDatetimeLocalValue(form.endsAt),
      };

      let banner: ApiPromotionBanner;
      if (editingBanner) {
        banner = await updateAdminPromotionBanner(editingBanner.id, payload);
        toast.success("Banner updated.");
      } else {
        banner = await createAdminPromotionBanner(payload);
        toast.success("Banner created.");
      }

      if (imageFile) {
        await uploadBannerImage(banner.id, imageFile);
        toast.success("Banner image uploaded.");
      }

      invalidate();
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save banner.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (banner: ApiPromotionBanner) => {
    if (!window.confirm(`Delete banner "${banner.title}"?`)) return;
    setIsSaving(true);
    try {
      await deleteAdminPromotionBanner(banner.id);
      invalidate();
      toast.success("Banner deleted.");
      if (editingBanner?.id === banner.id) closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete banner.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorder = async (next: ApiPromotionBanner[]) => {
    const previous = banners;
    const optimistic = next.map((item, index) => ({ ...item, sort_order: index }));
    queryClient.setQueryData(queryKeys.promotionBanners, optimistic);
    setIsSaving(true);
    try {
      await persistReorderedSort(next, (id, sortOrder) =>
        updateAdminPromotionBanner(id, { sortOrder }),
      );
      toast.success("Banner order updated");
    } catch (err) {
      queryClient.setQueryData(queryKeys.promotionBanners, previous);
      toast.error(err instanceof Error ? err.message : "Could not reorder.");
    } finally {
      setIsSaving(false);
      invalidate();
    }
  };

  const previewSrc =
    imagePreviewUrl ?? (editingBanner ? mediaUrl(editingBanner.image_key) : null);

  return (
    <>
      <AdminCard
        title="Home promotion banners"
        headerAction={
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={openCreateForm}
            icon={<Plus size={14} strokeWidth={2.5} aria-hidden />}
          >
            Add banner
          </Button>
        }
      >
        <p className="mb-4 text-sm leading-relaxed text-text-muted">
          Create promotional strips shown on the client home page. Drag a card to reorder
          (top shows first). Leave schedule empty to show anytime while active.
        </p>

        {isLoading && !banners.length ? (
          <InlineLoading label="Loading banners" />
        ) : error ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-4 text-xs text-warning">
            <div>{error}</div>
            {error.includes("promotion_banners") ? (
              <p className="mt-2 text-2xs">Run: cd movie-api && alembic upgrade head</p>
            ) : null}
            <button
              type="button"
              onClick={() => void bannersQuery.refetch()}
              className="mt-2 font-bold hover:underline"
            >
              Retry
            </button>
          </div>
        ) : banners.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-sm text-text-muted">No promotion banners yet.</p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-2 text-xs font-semibold text-brand hover:underline"
            >
              Add your first banner
            </button>
          </div>
        ) : (
          <SortableList
            items={banners}
            disabled={isSaving}
            onReorder={handleReorder}
            renderItem={(banner, index) => {
              const thumb = mediaUrl(banner.image_key);
              return (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated">
                    {thumb ? (
                      <Image src={thumb} alt="" fill className="object-cover" sizes="112px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xs text-text-disabled">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-mono text-2xs font-semibold tabular-nums text-text-muted">
                        #{index + 1}
                      </span>
                      <h3 className="text-sm font-bold">{banner.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                          banner.is_active
                            ? "bg-success/15 text-success"
                            : "bg-text-disabled/25 text-text-muted"
                        }`}
                      >
                        {banner.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className="text-2xs font-semibold uppercase text-text-disabled">
                        {banner.placement}
                      </span>
                    </div>
                    {banner.subtitle ? (
                      <p className="mt-1 text-xs text-text-muted">{banner.subtitle}</p>
                    ) : null}
                    {banner.cta_href ? (
                      <p className="mt-1 text-2xs text-text-muted">CTA {banner.cta_href}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditForm(banner)}
                      disabled={isSaving}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger-soft"
                      size="sm"
                      onClick={() => void handleDelete(banner)}
                      disabled={isSaving}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            }}
          />
        )}
      </AdminCard>

      {showForm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!isSaving) closeForm();
          }}
        >
          <form
            onSubmit={(e) => void handleSubmit(e)}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[min(90vh,920px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50"
          >
            {/* ── Header ── */}
            <div className="relative border-b border-border px-6 py-5">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand via-brand-hover to-brand/60" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[17px] font-bold tracking-[-0.02em]">
                    {editingBanner ? "Edit banner" : "New promotion banner"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    Promotional strips shown on the client home page when active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  aria-label="Close"
                  className="shrink-0 flex items-center justify-center size-8 rounded-lg border border-border bg-bg text-text-muted transition-all hover:border-border-hover hover:bg-surface-elevated hover:text-text"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Section: Content */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-text-muted">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M4.5 5h5M4.5 7.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  Content
                </div>
                <div>
                  <label className="mb-1.5 block text-2xs font-semibold text-text-muted">
                    Title <span className="text-brand">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Enter banner title…"
                    className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-disabled focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-2xs font-semibold text-text-muted">
                    Subtitle
                  </label>
                  <textarea
                    value={form.subtitle}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                    rows={2}
                    placeholder="Optional supporting text…"
                    className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-disabled focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10 resize-none"
                  />
                </div>
              </div>

              {/* Section: Banner Image */}
              <div className="border-t border-border px-6 py-5 space-y-3">
                <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-text-muted">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="5" cy="6" r="1.25" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 9.5l2.5-2.5 2 2 3-3 3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Banner Image
                </div>
                <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-bg/50 px-4 py-6 transition-all hover:border-brand/40 hover:bg-brand/[0.02]">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => updateImageFile(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  {previewSrc ? (
                    <div className="relative h-28 w-full overflow-hidden rounded-lg border border-border">
                      <Image src={previewSrc} alt="" fill className="object-cover" sizes="400px" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="rounded-lg bg-white/90 px-3 py-1.5 text-2xs font-bold text-text">
                          Change image
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-surface-elevated text-text-disabled transition-colors group-hover:bg-brand/10 group-hover:text-brand">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </div>
                      <p className="text-xs font-semibold text-text-muted">
                        Click to upload or drag & drop
                      </p>
                      <p className="mt-0.5 text-2xs text-text-disabled">
                        JPG, PNG or WebP
                      </p>
                    </>
                  )}
                </label>
              </div>

              {/* Section: Call-to-Action */}
              <div className="border-t border-border px-6 py-5 space-y-4">
                <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-text-muted">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h6M11.5 7l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Call to Action
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-2xs font-semibold text-text-muted">Button label</label>
                    <input
                      type="text"
                      value={form.ctaLabel}
                      onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                      placeholder="e.g. Subscribe now"
                      className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-disabled focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-2xs font-semibold text-text-muted">Button link</label>
                    <input
                      type="text"
                      value={form.ctaHref}
                      onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
                      placeholder="/pricing"
                      className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-disabled focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Display Settings */}
              <div className="border-t border-border px-6 py-5 space-y-4">
                <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-text-muted">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Display Settings
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-2xs font-semibold text-text-muted">Sort order</label>
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-disabled focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.isActive}
                      onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                      className="group flex items-center gap-3"
                    >
                      <span
                        className={[
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                          form.isActive ? "bg-success" : "bg-text-disabled/30",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                            form.isActive ? "translate-x-5" : "translate-x-0",
                          ].join(" ")}
                        />
                      </span>
                      <span className="text-xs font-semibold text-text">
                        {form.isActive ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-2xs font-semibold text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v2M6 9v2M1 6h2M9 6h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                        Starts at
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-2xs font-semibold text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v2M6 9v2M1 6h2M9 6h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                        Ends at
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10"
                    />
                  </div>
                </div>
                <p className="text-2xs text-text-disabled">
                  Leave empty to show anytime while active.
                </p>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/50 px-6 py-4">
              <Button type="button" variant="secondary" onClick={closeForm} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" loading={isSaving}>
                {isSaving ? "Saving…" : editingBanner ? "Save changes" : "Create banner"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
