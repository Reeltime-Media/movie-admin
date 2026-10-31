"use client";

import { ImageIcon, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { AssetPicker } from "../components/AssetPicker";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/ui/Button";
import { AdminSelect } from "../components/AdminSelect";
import { GenreMultiSelect } from "../components/GenreMultiSelect";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { WizardSteps } from "../components/WizardSteps";
import { useCreateGenre, useDeleteGenre, useGenres } from "../hooks/adminQueries";
import { SeasonsEpisodesEditor } from "../components/SeasonsEpisodesEditor";
import type { Season, Status } from "../lib/adminData";
import {
  createSeries,
  EPISODE_UPLOAD_CONCURRENCY,
  runPool,
  updateSeriesApi,
  uploadEpisodeWithAssets,
  uploadSeriesAssets,
} from "../lib/api";
import { useUploadProgress } from "../components/UploadProgressContext";
import { fromIctDatetimeLocalValue } from "../lib/datetimeIct";
import {
  defaultSeasons,
  episodeVideoReadyCount,
  episodesAllHaveVideo,
  validateSeriesSeasons,
} from "../lib/seriesHelpers";

const textInputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-disabled hover:border-border-hover focus:border-brand";

const selectClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors hover:border-border-hover focus:border-brand";

const stepLabels = ["Details", "Seasons & media"] as const;

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
      <span className="mb-1.5 block text-xs font-medium text-text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}

export function SeriesUploadWizard({
  isShortMovie = false,
}: {
  isShortMovie?: boolean;
}) {
  const router = useRouter();
  const { refreshMovies } = useMovieCatalog();
  const listHref = isShortMovie ? "/short-series" : "/series";
  const noun = isShortMovie ? "short series" : "series";
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("Published");
  const [publishAtLocal, setPublishAtLocal] = useState("");
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

  const videoProgress = useMemo(() => episodeVideoReadyCount(seasons), [seasons]);

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

  const goToStep = (next: number) => {
    setDetailsError(null);
    setSeasonsError(null);
    setSubmitError(null);
    setStep(next);
  };

  const failValidation = (message: string, targetStep: 0 | 1) => {
    setDetailsError(null);
    setSeasonsError(null);
    setSubmitError(null);
    if (targetStep === 0) setDetailsError(message);
    else setSeasonsError(message);
    setStep(targetStep);
    toast.warning(message);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const intent = String(fd.get("intent") || "");

    // Enter on earlier steps just advances — required fields are checked on Save/Upload.
    if (intent !== "draft" && intent !== "upload") {
      if (step < 1) goToStep(step + 1);
      return;
    }

    const title = String(fd.get("title") || "").trim();
    const titleKm = String(fd.get("titleKm") || "").trim();

    if (!title) {
      failValidation("Enter a title to save.", 0);
      return;
    }

    if (genres.length === 0) {
      failValidation("Select at least one genre.", 0);
      return;
    }

    if (!validateSeriesSeasons(seasons)) {
      failValidation(
        "Add at least one season with episodes, and give every episode a title.",
        1,
      );
      return;
    }

    if (intent === "upload" && !episodesAllHaveVideo(seasons)) {
      failValidation("Upload requires a video file for every episode.", 1);
      return;
    }

    const targetStatus: Status =
      intent === "draft" ? "Draft" : parseStatus(String(fd.get("status")));
    const publishAt =
      targetStatus === "Scheduled" ? fromIctDatetimeLocalValue(publishAtLocal) : null;
    if (targetStatus === "Scheduled" && !publishAt) {
      failValidation("Pick a go-live date and time (Cambodia time) for Scheduled.", 0);
      return;
    }
    if (targetStatus === "Published" && !seriesPosterFile) {
      failValidation("A series poster is required before publishing.", 1);
      return;
    }

    setSubmitError(null);
    setDetailsError(null);
    setSeasonsError(null);

    const seriesJobId = `series-${title}-${Date.now()}`;
    setActiveJobId(seriesJobId);
    startJob(seriesJobId, title, "Creating series…");
    setIsSubmitting(true);
    router.push(listHref);

    void (async () => {
      try {
        const series = await createSeries({
          title,
          titleKm: titleKm || null,
          monthlyPriceUsd: "6.99",
          description: String(fd.get("description") || "").trim() || undefined,
          genres,
          releaseYear: parseOptionalNumber(fd.get("releaseYear")),
          rating: String(fd.get("rating") || "").trim() || undefined,
          trailerUrl: String(fd.get("trailerUrl") || "").trim() || undefined,
          isShortMovie,
          status: "draft",
        });

        if (seriesPosterFile || seriesBannerFile) {
          setJobLabel(seriesJobId, `Uploading ${noun} artwork…`);
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
              status: toApiStatus(targetStatus === "Scheduled" ? "Draft" : targetStatus),
              isFree: Boolean(ep.isFree),
            },
            ep.videoFile!,
          );
          done += 1;
          updateJob(seriesJobId, Math.round((done / Math.max(episodesWithVideo.length, 1)) * 90));
        });

        if (targetStatus !== "Draft") {
          setJobLabel(seriesJobId, `Applying ${targetStatus.toLowerCase()} status…`);
          await updateSeriesApi(series.slug, {
            status: toApiStatus(targetStatus),
            publish_at: publishAt,
          });
        }
        updateJob(seriesJobId, 100);

        finishJob(seriesJobId);
        await refreshMovies();
        toast.success(
          intent === "draft"
            ? `${isShortMovie ? "Short series" : "Series"} saved as draft`
            : `${isShortMovie ? "Short series" : "Series"} created successfully`,
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : `${isShortMovie ? "Short series" : "Series"} creation failed`;
        failJob(seriesJobId, message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const currentJob = activeJobId ? (jobs.find((j) => j.id === activeJobId) ?? null) : null;

  return (
    <AdminShell title={isShortMovie ? "Upload new short series" : "Upload new series"}>
      <WizardSteps
        labels={stepLabels}
        step={step}
        onStepChange={goToStep}
        leading={
          <BackButton
            href={listHref}
            label={isShortMovie ? "Back to short series" : "Back to series"}
          />
        }
      />

      <form id="series-wizard-form" onSubmit={handleSubmit} noValidate className="w-full space-y-6">
        <div className={step === 0 ? "block" : "hidden"} aria-hidden={step !== 0}>
          <AdminCard title={isShortMovie ? "Short series details" : "Series details"}>
            <p className="mb-5 text-sm text-text-muted">
              Set the title, genres, and listing fields first. Next you&apos;ll add seasons,
              episode videos, and {noun} artwork.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="English title">
                <input name="title" placeholder="Echo Valley" className={textInputClass} />
              </Field>
              <Field label="Khmer title">
                <input name="titleKm" placeholder="Optional" className={textInputClass} />
              </Field>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-muted">
                    Genres
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewGenre((v) => !v);
                      setNewGenreName("");
                    }}
                    className="flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2 py-1 text-2xs font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                  >
                    New genre
                  </button>
                </div>
                {showNewGenre ? (
                  <div className="mb-2 flex gap-2">
                    <input
                      type="text"
                      value={newGenreName}
                      onChange={(e) => setNewGenreName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddGenre();
                        }
                      }}
                      placeholder="Genre name"
                      className={textInputClass}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0"
                      onClick={() => void handleAddGenre()}
                      disabled={createGenreMutation.isPending || !newGenreName.trim()}
                    >
                      {createGenreMutation.isPending ? "Adding…" : "Add"}
                    </Button>
                  </div>
                ) : null}
                <GenreMultiSelect
                  selected={genres}
                  onChange={setGenres}
                  options={genreOptions}
                  onDeleteGenre={handleDeleteGenre}
                />
              </div>

              <Field label="Release year">
                <input
                  name="releaseYear"
                  type="number"
                  min={1900}
                  max={2100}
                  placeholder="2026"
                  className={textInputClass}
                />
              </Field>

              <Field label="Rating">
                <input
                  name="rating"
                  inputMode="decimal"
                  placeholder="8.7"
                  className={textInputClass}
                />
              </Field>

              <Field
                label="Status"
                hint="Published requires a poster. Scheduled can upload anytime and goes live later (ICT)."
              >
                <AdminSelect
                  value={status}
                  onChange={(v) => {
                    setStatus(v);
                    if (v !== "Scheduled") setPublishAtLocal("");
                  }}
                  options={[
                    { value: "Draft", label: "Draft" },
                    { value: "Review", label: "Review" },
                    { value: "Scheduled", label: "Scheduled" },
                    { value: "Published", label: "Published" },
                  ]}
                  className={selectClass}
                  aria-label="Status"
                />
                <input type="hidden" name="status" value={status} />
              </Field>

              {status === "Scheduled" ? (
                <Field
                  label="Go live (ICT)"
                  hint="Cambodia time (UTC+7). Publishes automatically when a poster is ready."
                >
                  <input
                    type="datetime-local"
                    value={publishAtLocal}
                    onChange={(e) => setPublishAtLocal(e.target.value)}
                    className={textInputClass}
                    required
                  />
                </Field>
              ) : null}

              <div className="md:col-span-2">
                <Field
                  label="Trailer URL"
                  hint="Paste a YouTube URL. The trailer is linked, not uploaded."
                >
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
              <p className="mt-4 text-xs font-semibold text-warning">{detailsError}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              <Button type="button" onClick={() => goToStep(1)}>
                Continue to seasons & media
              </Button>
            </div>
          </AdminCard>
        </div>

        <div className={step === 1 ? "block" : "hidden"} aria-hidden={step !== 1}>
          <AdminCard title="Seasons & media">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-xl text-sm text-text-muted">
                Add seasons, set episode count, name episodes, and attach each video here.
                Series poster and banner are optional.
              </p>
              {videoProgress.total > 0 ? (
                <div
                  className={[
                    "shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold tabular-nums",
                    videoProgress.ready === videoProgress.total
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-warning/40 bg-warning/10 text-warning",
                  ].join(" ")}
                >
                  {videoProgress.ready}/{videoProgress.total} videos ready
                </div>
              ) : null}
            </div>

            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <AssetPicker
                accept="image/*"
                label={isShortMovie ? "Short series poster" : "Series poster"}
                hint="Portrait key art for catalog cards."
                previewAspect="poster"
                icon={<ImageIcon size={20} aria-hidden />}
                file={seriesPosterFile}
                onFileChange={setSeriesPosterFile}
              />
              <AssetPicker
                accept="image/*"
                label={isShortMovie ? "Short series banner" : "Series banner"}
                hint="Wide cinematic hero image. Optional."
                previewAspect="banner"
                icon={<ImagePlus size={20} aria-hidden />}
                file={seriesBannerFile}
                onFileChange={setSeriesBannerFile}
              />
            </div>

            <SeasonsEpisodesEditor
              seasons={seasons}
              onChange={setSeasons}
              includeVideo
            />

            {seasonsError ? (
              <p className="mt-4 text-xs font-semibold text-warning">{seasonsError}</p>
            ) : null}
            {submitError ? (
              <p className="mt-4 text-xs font-semibold text-warning">{submitError}</p>
            ) : null}
            {currentJob && currentJob.status !== "done" ? (
              <div className="mt-4 rounded-lg bg-surface-soft p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-text-muted">
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
                  <p className="mt-1 text-2xs text-danger">{currentJob.errorMsg}</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <BackButton label="Back" onClick={() => goToStep(0)} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  name="intent"
                  value="draft"
                  variant="secondary"
                  disabled={isSubmitting}
                >
                  Save draft
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value="upload"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Uploading…"
                    : isShortMovie
                      ? "Upload short series"
                      : "Upload series"}
                </Button>
              </div>
            </div>
          </AdminCard>
        </div>
      </form>
    </AdminShell>
  );
}
