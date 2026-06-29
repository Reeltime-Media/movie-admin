"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import { InlineLoading } from "./InlineLoading";
import {
  createAdminPromotionBanner,
  deleteAdminPromotionBanner,
  listAdminPromotionBanners,
  startAdminPromotionBannerImageUpload,
  updateAdminPromotionBanner,
  uploadFileToPresignedUrl,
  type ApiPromotionBanner,
} from "../lib/api";
import { adminDeleteButtonClassWide } from "../lib/adminUi";
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

  const previewSrc =
    imagePreviewUrl ?? (editingBanner ? mediaUrl(editingBanner.image_key) : null);

  return (
    <>
      <AdminCard title="Home promotion banners" action="Add banner" actionOnClick={openCreateForm}>
        <p className="mb-4 text-[13px] leading-relaxed text-text-muted">
          Create promotional strips shown on the client home page. Lower sort order appears first.
          Leave schedule empty to show anytime while active.
        </p>

        {isLoading && !banners.length ? (
          <InlineLoading label="Loading banners" />
        ) : error ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
            <div>{error}</div>
            {error.includes("promotion_banners") ? (
              <p className="mt-2 text-[11px]">Run: cd movie-api && alembic upgrade head</p>
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
          <div className="rounded-md border border-dashed border-border py-8 text-center">
            <p className="text-[13px] text-text-muted">No promotion banners yet.</p>
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-2 text-[12px] font-semibold text-brand hover:underline"
            >
              Add your first banner
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => {
              const thumb = mediaUrl(banner.image_key);
              return (
                <div
                  key={banner.id}
                  className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-bg p-4"
                >
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-sm border border-border bg-surface-elevated">
                    {thumb ? (
                      <Image src={thumb} alt="" fill className="object-cover" sizes="112px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-text-disabled">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-bold">{banner.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          banner.is_active
                            ? "bg-success/15 text-success"
                            : "bg-text-disabled/25 text-text-muted"
                        }`}
                      >
                        {banner.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className="text-[10px] font-semibold uppercase text-text-disabled">
                        {banner.placement}
                      </span>
                    </div>
                    {banner.subtitle ? (
                      <p className="mt-1 text-[12px] text-text-muted">{banner.subtitle}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-text-muted">
                      Sort {banner.sort_order}
                      {banner.cta_href ? ` · CTA ${banner.cta_href}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(banner)}
                      disabled={isSaving}
                      className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(banner)}
                      disabled={isSaving}
                      className={adminDeleteButtonClassWide}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>

      {showForm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!isSaving) closeForm();
          }}
        >
          <form
            onSubmit={(e) => void handleSubmit(e)}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-bold tracking-[-0.02em]">
                  {editingBanner ? "Edit banner" : "New banner"}
                </h2>
                <p className="mt-1 text-[12px] text-text-muted">
                  Shown on the client home page when active.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                aria-label="Close"
                className="shrink-0 rounded-md border border-border px-2 py-1 text-[18px] leading-none text-text-muted"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-text-muted">Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                  required
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-text-muted">Subtitle</span>
                <textarea
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-text-muted">Banner image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => updateImageFile(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full text-[12px] text-text-muted"
                />
                {previewSrc ? (
                  <div className="relative mt-2 h-24 w-full overflow-hidden rounded-md border border-border">
                    <Image src={previewSrc} alt="" fill className="object-cover" sizes="400px" />
                  </div>
                ) : null}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-semibold text-text-muted">Button label</span>
                  <input
                    type="text"
                    value={form.ctaLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    placeholder="e.g. Subscribe now"
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-text-muted">Button link</span>
                  <input
                    type="text"
                    value={form.ctaHref}
                    onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
                    placeholder="/pricing"
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-semibold text-text-muted">Sort order</span>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2">
                  <input
                    id="banner-active"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="size-4 rounded border-border"
                  />
                  <span className="text-[12px] font-semibold text-text">Active</span>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-semibold text-text-muted">Starts (optional)</span>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-text-muted">Ends (optional)</span>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-md border border-border px-4 py-2 text-[12px] font-semibold text-text-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {isSaving ? "Saving…" : editingBanner ? "Save changes" : "Create banner"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
