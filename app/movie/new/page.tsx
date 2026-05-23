"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../../components/AdminCard";
import { AdminShell } from "../../components/AdminShell";
import { GenreMultiSelect } from "../../components/GenreMultiSelect";
import { useMovieCatalog } from "../../components/MovieCatalogProvider";
import type { Status } from "../../lib/adminData";
import {
  completeMovieUpload,
  startMovieUpload,
  uploadFileToPresignedUrl,
  uploadMovieVideoMultipart,
} from "../../lib/api";
import { TrailerPreview } from "../../components/TrailerPreview";
import { useUploadProgress } from "../../components/UploadProgressContext";
import { formatGenres } from "../../lib/genres";
import { ADMIN_PRICE_HINT, validateAdminPriceUsd } from "../../lib/money";

const textInputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated";

const selectClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors focus:border-border-hover focus:bg-surface-elevated";

const fileInputClass =
  "w-full rounded-md border border-dashed border-border bg-bg px-3 py-4 text-[12px] text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-[12px] file:font-bold file:text-white hover:border-border-hover";

const stepLabels = ["Details", "Assets"] as const;

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

export default function NewMoviePage() {
  const router = useRouter();
  const { refreshMovies } = useMovieCatalog();
  const [step, setStep] = useState(0);
  const [genres, setGenres] = useState<string[]>([]);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { jobs, startJob, updateJob, setJobLabel, finishJob, failJob } = useUploadProgress();
  const jobIdRef = useRef<string | null>(null);

  const continueFromDetails = () => {
    setDetailsError(null);
    const form = document.getElementById("movie-wizard-form") as HTMLFormElement | null;
    const title = form?.querySelector<HTMLInputElement>('input[name="title"]')?.value?.trim() ?? "";
    if (!title) {
      const message = "Enter a title to continue.";
      setDetailsError(message);
      toast.warning(message);
      return;
    }
    const genre = formatGenres(genres);
    if (!genre) {
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

    const genre = formatGenres(genres);
    if (!genre) return;

    setSubmitError(null);

    const videoFile = fd.get("video");
    const posterFile = fd.get("poster");
    const video = videoFile instanceof File && videoFile.size > 0 ? videoFile : null;
    const posterImage = posterFile instanceof File && posterFile.size > 0 ? posterFile : null;

    if (!video) {
      const message = "Choose a movie video file before uploading.";
      setSubmitError(message);
      toast.warning(message);
      return;
    }

    const status: Status = intent === "draft" ? "Draft" : parseStatus(String(fd.get("status")));
    const movieJobId = `movie-${title}-${Date.now()}`;
    jobIdRef.current = movieJobId;
    startJob(movieJobId, title, "Starting upload…");
    setIsSubmitting(true);
    router.push("/movie");

    void (async () => {
      try {
        const upload = await startMovieUpload({
          title,
          videoContentType: video.type || "video/mp4",
          posterContentType: posterImage?.type,
        });

        if (posterImage && upload.poster_upload_url) {
          setJobLabel(movieJobId, "Uploading poster…");
          await uploadFileToPresignedUrl(upload.poster_upload_url, posterImage);
        }

        setJobLabel(movieJobId, "Uploading video…");
        const parts = await uploadMovieVideoMultipart(
          video,
          {
            sourceKey: upload.source_key,
            uploadId: upload.upload_id,
            partSize: upload.part_size,
          },
          (pct) => updateJob(movieJobId, pct),
        );

        const priceResult = validateAdminPriceUsd(String(fd.get("price") || "0"));
        if (!priceResult.ok) {
          throw new Error(priceResult.message);
        }

        setJobLabel(movieJobId, "Saving…");
        await completeMovieUpload({
          contentId: upload.content_id,
          slug: upload.slug,
          sourceKey: upload.source_key,
          uploadId: upload.upload_id,
          parts,
          title,
          priceUsd: priceResult.value,
          description: String(fd.get("description") || "").trim(),
          genres,
          releaseYear: parseOptionalNumber(fd.get("releaseYear")),
          rating: String(fd.get("rating") || "").trim(),
          runtime: String(fd.get("runtime") || "").trim(),
          status: toApiStatus(status),
          posterKey: upload.poster_key,
          trailerUrl: String(fd.get("trailerUrl") || "").trim(),
        });

        finishJob(movieJobId);
        await refreshMovies();
        toast.success(intent === "draft" ? "Draft saved" : "Movie uploaded successfully");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        failJob(movieJobId, message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const currentJob = jobIdRef.current ? (jobs.find((j) => j.id === jobIdRef.current) ?? null) : null;

  return (
    <AdminShell title="Upload new movie">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[72ch] text-[13px] leading-relaxed text-text-muted">
          Enter movie details and publishing settings, then upload the video directly to storage
          before transcoding starts.
        </p>
        <Link
          href="/movie"
          className="shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to movies
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

      <form id="movie-wizard-form" onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        <div className={step === 0 ? "block" : "hidden"} aria-hidden={step !== 0}>
          <AdminCard title="Movie details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <input name="title" required placeholder="The Last Drive" className={textInputClass} />
              </Field>

              <div className="md:col-span-2">
                <div className="mb-1.5 text-[12px] font-semibold text-text-muted">Genres</div>
                <GenreMultiSelect selected={genres} onChange={setGenres} />
                <p className="mt-1.5 text-[11px] text-text-disabled">Open the list and select one or more genres.</p>
              </div>

              <Field label="Release year">
                <input name="releaseYear" type="number" min={1900} max={2100} placeholder="2026" className={textInputClass} />
              </Field>

              <Field label="Rating">
                <input name="rating" inputMode="decimal" placeholder="8.7" className={textInputClass} />
              </Field>

              <Field label="Runtime">
                <input name="runtime" placeholder="1h 42m" className={textInputClass} />
              </Field>

              <Field label="Status" hint="Upload uses this status. Save draft always saves as Draft.">
                <select name="status" defaultValue="Published" className={selectClass}>
                  <option>Draft</option>
                  <option>Review</option>
                  <option>Scheduled</option>
                  <option>Published</option>
                </select>
              </Field>

              <Field label="Price (USD)" hint={ADMIN_PRICE_HINT}>
                <input name="price" placeholder="0 or 2.99" className={textInputClass} />
              </Field>

              <div className="md:col-span-2">
                <Field label="Trailer URL" hint="Paste a YouTube URL. The trailer is linked, not uploaded.">
                  <input
                    name="trailerUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={textInputClass}
                    value={trailerUrl}
                    onChange={(e) => setTrailerUrl(e.target.value)}
                  />
                </Field>
                <TrailerPreview url={trailerUrl} />
              </div>

              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea
                    name="description"
                    rows={5}
                    placeholder="Short synopsis shown on detail pages and promotional placements."
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
                href="/movie"
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
          <AdminCard title="Upload assets">
            <p className="mb-5 text-[13px] text-text-muted">
              Attach poster and main video. The video is sent directly to R2, then the API queues
              transcoding.
            </p>
            <div className="space-y-4">
              <Field label="Poster image" hint="PNG, JPG, or WebP. Recommended portrait poster.">
                <input name="poster" type="file" accept="image/*" className={fileInputClass} />
              </Field>
              <Field label="Movie file" hint="MP4 or MOV.">
                <input name="video" type="file" accept="video/mp4,video/quicktime,video/*" className={fileInputClass} />
              </Field>
            </div>

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
                onClick={() => setStep(0)}
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
