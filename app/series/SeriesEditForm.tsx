"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { InlineLoading } from "../components/InlineLoading";
import { SeasonsEpisodesEditor } from "../components/SeasonsEpisodesEditor";
import { TrailerPreview } from "../components/TrailerPreview";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { uploadSeriesAssets } from "../lib/api";
import type { CatalogEntry, Status } from "../lib/adminData";
import { formatGenres, parseGenresFromStored } from "../lib/genres";
import { ADMIN_PRICE_HINT, validateAdminPriceUsd } from "../lib/money";
import { validateSeriesSeasons } from "../lib/seriesHelpers";
import { pickAssetFile, pickFileFromInput } from "../movie/movieEditHelpers";
import {
  EditField,
  formatMovieDate,
  movieEditInputClass,
  movieEditSelectClass,
  movieFileInputClass,
} from "../movie/movieDetailUi";
import { toSeriesDraft } from "./seriesEditHelpers";

const statuses: Status[] = ["Published", "Draft", "Scheduled", "Review"];

function ArtworkField({
  label,
  hint,
  previewUrl,
  currentKey,
  newFile,
  onFileChange,
}: {
  label: string;
  hint: string;
  previewUrl: string | null;
  currentKey?: string | null;
  newFile: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const aspectClass = label === "Banner" ? "aspect-21/9" : "aspect-2/3";

  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <div className="mb-1 text-[14px] font-bold tracking-[-0.02em]">{label}</div>
      <p className="mb-3 text-[12px] text-text-muted">{hint}</p>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={`${label} preview`}
          className={`${aspectClass} w-full rounded-lg border border-border object-cover`}
        />
      ) : (
        <div
          className={`grid ${aspectClass} place-items-center rounded-lg border border-dashed border-border bg-surface text-center text-[13px] text-text-muted`}
        >
          No {label.toLowerCase()} uploaded
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className={movieFileInputClass}
        onChange={(e) => onFileChange(pickFileFromInput(e.target.files))}
      />
      {newFile ? (
        <p className="mt-2 break-all text-[11px] text-text-muted">New file: {newFile.name}</p>
      ) : (
        <p className="mt-2 break-all text-[11px] text-text-disabled">
          {currentKey || `No ${label.toLowerCase()} uploaded`}
        </p>
      )}
    </div>
  );
}

export function SeriesEditForm({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const { movies, isLoading, error, updateMovie, refreshMovies } = useMovieCatalog();
  const series = movies.find((item) => item.id === seriesId && item.type === "Series");

  const [editDraft, setEditDraft] = useState<Omit<CatalogEntry, "id"> | null>(null);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);
  const [editPosterFile, setEditPosterFile] = useState<File | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!series) return;
    setEditDraft(structuredClone(toSeriesDraft(series)));
    setEditSaveError(null);
    setEditPosterFile(null);
    setEditBannerFile(null);
  }, [series?.id, series?.updatedAt]);

  const editPosterPreviewUrl = useMemo(
    () => (editPosterFile ? URL.createObjectURL(editPosterFile) : null),
    [editPosterFile],
  );
  const editBannerPreviewUrl = useMemo(
    () => (editBannerFile ? URL.createObjectURL(editBannerFile) : null),
    [editBannerFile],
  );
  const posterPreviewUrl = editPosterPreviewUrl ?? series?.posterUrl ?? null;
  const bannerPreviewUrl = editBannerPreviewUrl ?? series?.bannerUrl ?? null;

  const patchDraft = (patch: Partial<Omit<CatalogEntry, "id">>) => {
    setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  useEffect(() => {
    return () => {
      if (editPosterPreviewUrl) URL.revokeObjectURL(editPosterPreviewUrl);
    };
  }, [editPosterPreviewUrl]);

  useEffect(() => {
    return () => {
      if (editBannerPreviewUrl) URL.revokeObjectURL(editBannerPreviewUrl);
    };
  }, [editBannerPreviewUrl]);

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!series || !editDraft || !series.slug) return;
    if (!editDraft.title.trim()) return;
    if (!editDraft.genre.trim()) return;

    if (!validateSeriesSeasons(editDraft.seasons)) {
      const message = "Series needs at least one season, and every episode needs a title.";
      setEditSaveError(message);
      toast.warning(message);
      return;
    }

    const priceResult = validateAdminPriceUsd(editDraft.price);
    if (!priceResult.ok) {
      setEditSaveError(priceResult.message);
      toast.error(priceResult.message);
      return;
    }

    const posterFile = pickAssetFile(editPosterFile);
    const bannerFile = pickAssetFile(editBannerFile);

    setEditSaveError(null);
    setIsSaving(true);
    try {
      const hasNewAssets = Boolean(posterFile || bannerFile);
      if (hasNewAssets) {
        await uploadSeriesAssets(series.slug, { poster: posterFile, banner: bannerFile });
      }

      await updateMovie(series.id, editDraft);
      if (hasNewAssets) {
        await refreshMovies();
      }
      toast.success("Series updated successfully");
      router.push(`/series/${series.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save changes.";
      setEditSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || (series && !editDraft)) {
    return (
      <AdminCard title="Edit series">
        <InlineLoading label="Loading series" />
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard title="Edit series">
        <p className="text-[13px] text-warning">{error}</p>
        <button
          type="button"
          onClick={() => void refreshMovies()}
          className="mt-3 text-[12px] font-bold text-brand hover:underline"
        >
          Retry
        </button>
      </AdminCard>
    );
  }

  if (!series || !editDraft) {
    return (
      <AdminCard title="Series not found">
        <p className="text-[13px] text-text-muted">This series is not in the admin catalog.</p>
        <Link
          href="/series"
          className="mt-4 inline-flex rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to series
        </Link>
      </AdminCard>
    );
  }

  return (
    <form onSubmit={saveEdit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/series/${series.id}`}
          className="rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <header className="border-b border-border bg-surface-elevated px-6 py-6 md:px-10">
          <h2 className="mb-1 text-[18px] font-extrabold tracking-[-0.02em]">Edit series</h2>
          <p className="text-[13px] text-text-muted">{series.title}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <EditField label="Title">
              <input
                className={movieEditInputClass}
                value={editDraft.title}
                onChange={(e) => patchDraft({ title: e.target.value })}
                required
              />
            </EditField>
            <EditField label="Status">
              <select
                className={movieEditSelectClass}
                value={editDraft.status}
                onChange={(e) => patchDraft({ status: e.target.value as Status })}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </EditField>
            <EditField label="Monthly price (USD)">
              <input
                className={movieEditInputClass}
                value={editDraft.price.replace(/^\$/, "")}
                onChange={(e) => patchDraft({ price: e.target.value ? `$${e.target.value}` : "Free" })}
                placeholder="6.99"
              />
              <p className="mt-1 text-[11px] text-text-disabled">{ADMIN_PRICE_HINT}</p>
            </EditField>
            <EditField label="Rating">
              <input
                className={movieEditInputClass}
                value={editDraft.rating === "-" ? "" : editDraft.rating}
                onChange={(e) => patchDraft({ rating: e.target.value || "-" })}
                placeholder="8.7"
              />
            </EditField>
            <EditField label="Release year">
              <input
                className={movieEditInputClass}
                type="number"
                min={1900}
                max={2100}
                value={editDraft.releaseYear ?? ""}
                onChange={(e) =>
                  patchDraft({
                    releaseYear: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </EditField>
            <EditField label="Updated">
              <span className="text-[13px] font-semibold text-text">
                {formatMovieDate(series.updatedAt)}
              </span>
            </EditField>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-text-disabled">
              Genres
            </span>
            <GenreMultiSelect
              selected={parseGenresFromStored(editDraft.genre)}
              onChange={(next) => patchDraft({ genre: formatGenres(next) })}
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-text-disabled">
              Description
            </span>
            <textarea
              className={`${movieEditInputClass} min-h-20 resize-y font-normal`}
              value={editDraft.description ?? ""}
              onChange={(e) => patchDraft({ description: e.target.value || null })}
              placeholder="Brief synopsis shown on the series page…"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-text-disabled">
              Trailer URL
            </span>
            <input
              className={movieEditInputClass}
              type="url"
              value={editDraft.trailerUrl ?? ""}
              onChange={(e) => patchDraft({ trailerUrl: e.target.value || null })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <TrailerPreview url={editDraft.trailerUrl ?? ""} />
          </label>
        </header>

        <div className="space-y-8 border-b border-border bg-bg p-6 md:p-10">
          <div>
            <h3 className="mb-1 text-[16px] font-bold tracking-[-0.02em]">Artwork</h3>
            <p className="mb-5 text-[13px] text-text-muted">
              Upload a portrait poster for catalog cards and a wide banner for the home page hero.
            </p>
            <div className="grid gap-5 lg:grid-cols-2">
              <ArtworkField
                label="Poster"
                hint="Portrait key art shown on series cards."
                previewUrl={posterPreviewUrl}
                currentKey={series.posterKey}
                newFile={editPosterFile}
                onFileChange={setEditPosterFile}
              />
              <ArtworkField
                label="Banner"
                hint="Wide cinematic image used on the home page hero."
                previewUrl={bannerPreviewUrl}
                currentKey={series.bannerKey}
                newFile={editBannerFile}
                onFileChange={setEditBannerFile}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-[16px] font-bold tracking-[-0.02em]">Seasons and episodes</h3>
            <p className="mb-5 text-[13px] text-text-muted">
              Edit season and episode metadata. Episode video uploads are managed when creating a
              series or from the series detail page.
            </p>
            <SeasonsEpisodesEditor
              seasons={editDraft.seasons}
              onChange={(next) => patchDraft({ seasons: next })}
            />
          </div>
        </div>
      </section>

      {editSaveError ? (
        <p className="text-[12px] font-semibold text-warning">{editSaveError}</p>
      ) : null}
    </form>
  );
}
