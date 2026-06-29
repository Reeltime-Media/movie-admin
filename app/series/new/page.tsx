"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../../components/AdminCard";
import { AdminShell } from "../../components/AdminShell";
import { EpisodeAssetsUploader } from "../../components/EpisodeAssetsUploader";
import { GenreMultiSelect } from "../../components/GenreMultiSelect";
import { useMovieCatalog } from "../../components/MovieCatalogProvider";
import { useCreateGenre, useDeleteGenre, useGenres } from "../../hooks/adminQueries";
import { SeasonsEpisodesEditor } from "../../components/SeasonsEpisodesEditor";
import type { Season, Status } from "../../lib/adminData";
import {
  createSeries,
  EPISODE_UPLOAD_CONCURRENCY,
  runPool,
  uploadEpisodeWithAssets,
  uploadSeriesAssets,
} from "../../lib/api";
import { useUploadProgress } from "../../components/UploadProgressContext";
import {
  defaultSeasons,
  episodesAllHaveVideo,
  validateSeriesSeasons,
} from "../../lib/seriesHelpers";

const textInputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated";

const selectClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors focus:border-border-hover focus:bg-surface-elevated";

const fileInputClass =
  "w-full rounded-md border border-dashed border-border bg-bg px-3 py-4 text-[12px] text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-[12px] file:font-bold file:text-white hover:border-border-hover";

const stepLabels = ["Details", "Seasons", "Episode media"] as const;

function parseStatus(s: string): Status {
  if (s === "Published" || s === "Draft" || s === "Scheduled" || s === "Review") return s;
  return "Draft";
}

function toApiStatus(status: Status) {
  return status.toLowerCase();
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] text-text-disabled">{hint}</span> : null}
    </label>
  );
}

export default function NewSeriesPage() {
  const router = useRouter();
  const { refreshMovies } = useMovieCatalog();
  const [step, setStep] = useState(0);
  const [genres, setGenres] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<Season[]>(() => defaultSeasons());
  const [seriesPosterFile, setSeriesPosterFile] = useState<File | null>(null);
  const [seriesBannerFile, setSeriesBannerFile] = useState<File | null>(null);
  const [showNewGenre, setShowNewGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const { data: genreData } = useGenres();
  const createGenreMutation = useCreateGenre();
  const deleteGenreMutation = useDeleteGenre();
  const genreOptions = genreData?.map((g) => g.name);

  const handleDeleteGenre = (name: string) => {
    const genre = genreData?.find((g) => g.name === name);
    if (!genre) return;
    deleteGenreMutation.mutate(genre.id, {
      onSuccess: () => setGenres((prev) => prev.filter((g) => g !== name)),
      onError: () => toast.error("Could not delete genre"),
    });
  };

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { jobs, startJob, updateJob, setJobLabel, finishJob, failJob } = useUploadProgress();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const continueFromSeasons = () => {
    setSeasonsError(null);
    if (!validateSeriesSeasons(seasons)) {
      const message = "Add at least one season with episodes, and give every episode a title before continuing.";
      setSeasonsError(message);
      toast.warning(message);
      return;
    }
    setStep(2);
  };

  const handleAddGenre = async () => {
    const name = newGenreName.trim();
    if (!name) return;
    try {
      const created = await createGenreMutation.mutateAsync(name);
      setGenres((prev) => [...prev, created.name]);
      setNewGenreName("");
      setShowNewGenre(false);
    } catch {
      toast.error("Could not create genre");
    }
  };

  const continueFromDetails = () => {
    setDetailsError(null);
    const form = document.getElementById("series-wizard-form") as HTMLFormElement | null;
    const title = form?.querySelector<HTMLInputElement>('input[name="title"]')?.value?.trim() ?? "";
    if (!title) {
      const message = "Enter a title to continue.";
      setDetailsError(message);
      toast.warning(message);
      return;
    }
    if (genres.length === 0) {
      const message = "Select at least one genre.";
      setDetailsError(message);
      toast.warning(message);
      return;
    }
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const intent = String(fd.get("intent") || "");
    const title = String(fd.get("title") || "").trim();
    if (!title) return;

    if (genres.length === 0) return;

    setSubmitError(null);

    if (!validateSeriesSeasons(seasons)) {
      const message = "Add at least one season with episodes, and give every episode a title.";
      setSubmitError(message);
      toast.warning(message);
      return;
    }

    if (intent === "upload" && !episodesAllHaveVideo(seasons)) {
      const message = "Upload requires a video file for every episode. Poster per episode is optional.";
      setSubmitError(message);
      toast.warning(message);
      return;
    }

    const status: Status = intent === "draft" ? "Draft" : parseStatus(String(fd.get("status")));
    const seriesJobId = `series-${title}-${Date.now()}`;
    setActiveJobId(seriesJobId);
    startJob(seriesJobId, title, "Creating series…");
    setIsSubmitting(true);
    router.push("/series");

    void (async () => {
      try {
        const series = await createSeries({
          title,
          monthlyPriceUsd: "6.99",
          description: String(fd.get("description") || "").trim() || undefined,
          genres,
          releaseYear: parseOptionalNumber(fd.get("releaseYear")),
          rating: String(fd.get("rating") || "").trim() || undefined,
          trailerUrl: String(fd.get("trailerUrl") || "").trim() || undefined,
        });

        if (seriesPosterFile || seriesBannerFile) {
          setJobLabel(seriesJobId, "Uploading series artwork…");
          await uploadSeriesAssets(series.slug, {
            poster: seriesPosterFile,
            banner: seriesBannerFile,
          });
        }

        const allEpisodes = seasons.flatMap((s) => s.episodes.map((ep) => ({ season: s, ep })));
        const episodesWithVideo = allEpisodes.filter((x) => x.ep.videoFile);
        let done = 0;

        await runPool(episodesWithVideo, EPISODE_UPLOAD_CONCURRENCY, async ({ season, ep }) => {
          setJobLabel(seriesJobId, `Uploading S${season.number}E${ep.number} – ${ep.title}…`);
          await uploadEpisodeWithAssets(
            series.slug,
            {
              title: ep.title,
              seasonNumber: season.number,
              episodeNumber: ep.number,
              runtime: ep.runtime || undefined,
              status: toApiStatus(status),
              isFree: Boolean(ep.isFree),
            },
            ep.videoFile!,
            ep.posterFile,
          );
          done += 1;
          updateJob(seriesJobId, Math.round((done / episodesWithVideo.length) * 100));
        });

        finishJob(seriesJobId);
        await refreshMovies();
        toast.success(intent === "draft" ? "Series saved as draft" : "Series created successfully");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Series creation failed";
        failJob(seriesJobId, message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const currentJob = activeJobId ? (jobs.find((j) => j.id === activeJobId) ?? null) : null;

  return (
    <AdminShell title="Upload new series">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[72ch] text-[13px] leading-relaxed text-text-muted">
          Enter show details, build seasons and episodes, then attach poster and per-episode video
          files.
        </p>
        <Link
          href="/series"
          className="shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to series
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {stepLabels.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 ? (
                <span className="text-[12px] font-bold text-text-disabled" aria-hidden>/</span>
              ) : null}
              <span
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest",
                  active ? "bg-brand text-white" : done ? "bg-success/15 text-success" : "bg-surface text-text-muted",
                ].join(" ")}
              >
                {i + 1}. {label}
              </span>
            </div>
          );
        })}
      </div>

      <form id="series-wizard-form" onSubmit={handleSubmit} className="w-full space-y-6">
        <div className={step === 0 ? "block" : "hidden"} aria-hidden={step !== 0}>
          <AdminCard title="Series details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <input name="title" required placeholder="Echo Valley" className={textInputClass} />
              </Field>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-text-muted">Genres</span>
                  <button
                    type="button"
                    onClick={() => { setShowNewGenre((v) => !v); setNewGenreName(""); }}
                    className="flex items-center gap-1 rounded-md border border-border bg-surface-elevated px-2 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden><path d="M6.5 1.5a.5.5 0 0 0-1 0V5.5H1.5a.5.5 0 0 0 0 1H5.5v4a.5.5 0 0 0 1 0V6.5h4a.5.5 0 0 0 0-1H6.5V1.5Z"/></svg>
                    New genre
                  </button>
                </div>
                {showNewGenre ? (
                  <div className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={newGenreName}
                      onChange={(e) => setNewGenreName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAddGenre(); } }}
                      placeholder="Genre name"
                      className={textInputClass}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddGenre()}
                      disabled={createGenreMutation.isPending || !newGenreName.trim()}
                      className="shrink-0 rounded-md bg-brand px-3 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
                    >
                      {createGenreMutation.isPending ? "Adding…" : "Add"}
                    </button>
                  </div>
                ) : null}
                <GenreMultiSelect selected={genres} onChange={setGenres} options={genreOptions} onDeleteGenre={handleDeleteGenre} />
              </div>

              <Field label="Release year">
                <input name="releaseYear" type="number" min={1900} max={2100} placeholder="2026" className={textInputClass} />
              </Field>

              <Field label="Rating">
                <input name="rating" inputMode="decimal" placeholder="8.7" className={textInputClass} />
              </Field>

              <Field label="Status">
                <select name="status" defaultValue="Published" className={selectClass}>
                  <option>Draft</option>
                  <option>Review</option>
                  <option>Scheduled</option>
                  <option>Published</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Trailer URL" hint="Paste a YouTube URL. The trailer is linked, not uploaded.">
                  <input
                    name="trailerUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={textInputClass}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea
                    name="description"
                    rows={5}
                    placeholder="Short synopsis shown on detail pages."
                    className={`${textInputClass} resize-y`}
                  />
                </Field>
              </div>
            </div>

            {detailsError ? (
              <p className="mt-4 text-[12px] font-semibold text-warning">{detailsError}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Link
                href="/series"
                className="rounded-md border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={continueFromDetails}
                className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
              >
                Continue
              </button>
            </div>
          </AdminCard>
        </div>

        <div className={step === 1 ? "block" : "hidden"} aria-hidden={step !== 1}>
          <AdminCard title="Seasons and episodes">
            <p className="mb-5 text-[13px] text-text-muted">
              Create every season and episode. You will attach video and poster files for each
              episode in the final step.
            </p>
            <SeasonsEpisodesEditor seasons={seasons} onChange={setSeasons} />
            {seasonsError ? (
              <p className="mt-4 text-[12px] font-semibold text-warning">{seasonsError}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-md border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                Back
              </button>
              <button
                type="button"
                onClick={continueFromSeasons}
                className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
              >
                Continue
              </button>
            </div>
          </AdminCard>
        </div>

        <div className={step === 2 ? "block" : "hidden"} aria-hidden={step !== 2}>
          <AdminCard title="Episode media">
            <p className="mb-5 text-[13px] text-text-muted">
              Upload series poster and banner (optional), then attach each episode&apos;s video
              (required for Upload) and episode poster (optional).
            </p>

            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-bg p-4">
                <Field label="Series poster" hint="Portrait key art for catalog cards.">
                  <input
                    type="file"
                    accept="image/*"
                    className={fileInputClass}
                    onChange={(e) => setSeriesPosterFile(e.target.files?.[0] ?? null)}
                  />
                  {seriesPosterFile ? (
                    <p className="mt-2 text-[11px] text-text-muted">{seriesPosterFile.name}</p>
                  ) : null}
                </Field>
              </div>
              <div className="rounded-lg border border-border bg-bg p-4">
                <Field label="Series banner" hint="Wide cinematic image for the home hero.">
                  <input
                    type="file"
                    accept="image/*"
                    className={fileInputClass}
                    onChange={(e) => setSeriesBannerFile(e.target.files?.[0] ?? null)}
                  />
                  {seriesBannerFile ? (
                    <p className="mt-2 text-[11px] text-text-muted">{seriesBannerFile.name}</p>
                  ) : null}
                </Field>
              </div>
            </div>

            <EpisodeAssetsUploader seasons={seasons} onChange={setSeasons} />

            {submitError ? (
              <p className="mt-4 text-[12px] font-semibold text-warning">{submitError}</p>
            ) : null}
            {currentJob && currentJob.status !== "done" ? (
              <div className="mt-4 rounded-md border border-border bg-bg p-3">
                <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-text-muted">
                  <span>{currentJob.label}</span>
                  <span className="tabular-nums">{currentJob.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className={`h-full rounded-full transition-all ${currentJob.status === "error" ? "bg-danger" : "bg-brand"}`}
                    style={{ width: `${currentJob.percent}%` }}
                  />
                </div>
                {currentJob.status === "error" && currentJob.errorMsg ? (
                  <p className="mt-1 text-[11px] text-danger">{currentJob.errorMsg}</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                Back
              </button>
              <button
                type="submit"
                name="intent"
                value="draft"
                disabled={isSubmitting}
                className="rounded-md border border-border bg-surface-elevated px-4 py-2.5 text-[12px] font-bold text-text transition-colors hover:border-border-hover disabled:opacity-40"
              >
                Save draft
              </button>
              <button
                type="submit"
                name="intent"
                value="upload"
                disabled={isSubmitting}
                className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
              >
                {isSubmitting ? "Uploading…" : "Upload"}
              </button>
            </div>
          </AdminCard>
        </div>
      </form>
    </AdminShell>
  );
}
