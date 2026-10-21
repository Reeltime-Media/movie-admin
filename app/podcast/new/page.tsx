"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "../../components/AdminCard";
import { AdminSelect } from "../../components/AdminSelect";
import { AdminShell } from "../../components/AdminShell";
import { GenreMultiSelect } from "../../components/GenreMultiSelect";
import { WizardSteps } from "../../components/WizardSteps";
import { Button } from "../../components/ui/Button";
import { useUploadProgress } from "../../components/UploadProgressContext";
import { useCreateGenre, useDeleteGenre, useGenres } from "../../hooks/adminQueries";
import type { Status } from "../../lib/adminData";
import {
  createAdminPodcastDraft,
  updateAdminPodcast,
  uploadAdminPodcastAssets,
} from "../../lib/api";
import { parseRuntimeMinutesInput } from "../../lib/runtime";
import {
  PODCAST_ACCESS_OPTIONS,
  isFreeFromPodcastAccess,
  podcastFileInputClass,
  podcastSelectClass,
  podcastTextInputClass,
  toApiStatus,
  toUiStatus,
  validatePodcastPublishReady,
  type PodcastAccess,
} from "../podcastUi";

const stepLabels = ["Details", "Assets"] as const;

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
      <span className="mb-1.5 block text-xs font-semibold text-white">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-2xs font-medium text-white">{hint}</span> : null}
    </label>
  );
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function NewPodcastPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("Published");
  const [genres, setGenres] = useState<string[]>(["Horror"]);
  const [access, setAccess] = useState<PodcastAccess>("plan");
  const [showNewGenre, setShowNewGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const { data: genreData } = useGenres();
  const createGenreMutation = useCreateGenre();
  const deleteGenreMutation = useDeleteGenre();
  const genreOptions = genreData?.map((g) => g.name);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { jobs, startJob, updateJob, setJobLabel, finishJob, failJob } = useUploadProgress();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const handleDeleteGenre = (name: string) => {
    const genre = genreData?.find((g) => g.name === name);
    if (!genre) return;
    deleteGenreMutation.mutate(genre.id, {
      onSuccess: () => setGenres((prev) => prev.filter((g) => g !== name)),
      onError: () => toast.error("Could not delete genre"),
    });
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

  const goToStep = (next: number) => {
    setDetailsError(null);
    setSubmitError(null);
    setStep(next);
  };

  const failValidation = (message: string, targetStep: 0 | 1) => {
    if (targetStep === 0) {
      setDetailsError(message);
      setSubmitError(null);
    } else {
      setSubmitError(message);
      setDetailsError(null);
    }
    setStep(targetStep);
    toast.warning(message);
  };

  const readCommonFields = (fd: FormData) => {
    const title = String(fd.get("title") || "").trim();
    if (!title) {
      return { ok: false as const, message: "Enter a title to save." };
    }

    const runtimeResult = parseRuntimeMinutesInput(fd.get("runtimeMinutes"));
    if (!runtimeResult.ok) {
      return { ok: false as const, message: runtimeResult.message };
    }

    return {
      ok: true as const,
      title,
      titleKm: String(fd.get("titleKm") || "").trim(),
      genres,
      isFree: isFreeFromPodcastAccess(access),
      runtimeMinutes: runtimeResult.value,
      description: String(fd.get("description") || "").trim(),
      releaseYear: parseOptionalNumber(fd.get("releaseYear")),
    };
  };

  const getWizardForm = () =>
    document.getElementById("podcast-wizard-form") as HTMLFormElement | null;

  const runWizardAction = async (intent: "draft" | "upload") => {
    const form = getWizardForm();
    if (!form) return;
    const fd = new FormData(form);

    const fields = readCommonFields(fd);
    if (!fields.ok) {
      failValidation(fields.message, 0);
      return;
    }

    const posterFile = fd.get("poster");
    const audioFile = fd.get("audio");
    const poster = posterFile instanceof File && posterFile.size > 0 ? posterFile : null;
    const audio = audioFile instanceof File && audioFile.size > 0 ? audioFile : null;

    const targetStatus: Status =
      intent === "draft" ? "Draft" : toUiStatus(String(fd.get("status") || status));

    if (intent === "upload") {
      if (genres.length === 0) {
        failValidation("Select at least one genre.", 0);
        return;
      }
      if (targetStatus === "Published") {
        const publishCheck = validatePodcastPublishReady(
          { poster_key: null, audio_key: null },
          { posterFile: poster, audioFile: audio },
        );
        if (!publishCheck.ok) {
          failValidation(publishCheck.message, 1);
          return;
        }
      } else if (!audio) {
        failValidation("Choose an audio file before uploading.", 1);
        return;
      }
    }

    const jobId = `podcast-${fields.title}-${Date.now()}`;
    setActiveJobId(jobId);
    startJob(jobId, fields.title, "Creating podcast…");
    setIsSubmitting(true);
    setSubmitError(null);
    setDetailsError(null);
    router.push("/podcast");

    void (async () => {
      try {
        const created = await createAdminPodcastDraft({
          title: fields.title,
          titleKm: fields.titleKm || null,
          description: fields.description || undefined,
          genres: fields.genres,
          releaseYear: fields.releaseYear,
          runtimeMinutes: fields.runtimeMinutes,
          isFree: fields.isFree,
        });

        if (poster || audio) {
          setJobLabel(jobId, poster && audio ? "Uploading cover & audio…" : poster ? "Uploading cover…" : "Uploading audio…");
          await uploadAdminPodcastAssets(
            created.id,
            { poster, audio },
            (pct) => updateJob(jobId, pct),
          );
        }

        if (targetStatus !== "Draft") {
          setJobLabel(jobId, "Saving status…");
          await updateAdminPodcast(created.id, {
            title: fields.title,
            titleKm: fields.titleKm || null,
            description: fields.description || null,
            genres: fields.genres,
            runtimeMinutes: fields.runtimeMinutes ?? null,
            releaseYear: fields.releaseYear ?? null,
            status: toApiStatus(targetStatus),
            isFree: fields.isFree,
          });
        }

        finishJob(jobId);
        void queryClient.invalidateQueries({ queryKey: ["podcasts"] });
        toast.success(targetStatus === "Draft" ? "Draft saved" : "Podcast uploaded successfully");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        failJob(jobId, message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const handleSaveDraftClick = () => {
    void runWizardAction("draft");
  };

  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step !== 1) {
      goToStep(1);
      return;
    }
    void runWizardAction("upload");
  };

  const currentJob = activeJobId ? (jobs.find((j) => j.id === activeJobId) ?? null) : null;

  return (
    <AdminShell
      title="Upload new podcast"
      headerAction={
        <Button href="/podcast" variant="secondary" size="sm" className="shrink-0">
          Back to podcasts
        </Button>
      }
    >
      <WizardSteps labels={stepLabels} step={step} onStepChange={goToStep} />

      <form id="podcast-wizard-form" onSubmit={handleUploadSubmit} noValidate className="w-full space-y-6">
        <div className={step === 0 ? "block" : "hidden"} aria-hidden={step !== 0}>
          <AdminCard title="Podcast details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="English title">
                <input name="title" placeholder="Night Whispers" className={podcastTextInputClass} />
              </Field>
              <Field label="Khmer title">
                <input name="titleKm" placeholder="Optional" className={podcastTextInputClass} />
              </Field>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text-muted">Genres</span>
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
                      className={podcastTextInputClass}
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
                <p className="mt-1.5 text-2xs text-text-disabled">
                  Defaults to Horror. Required for upload.
                </p>
              </div>

              <Field label="Release year">
                <input
                  name="releaseYear"
                  type="number"
                  min={1900}
                  max={2100}
                  placeholder="2026"
                  className={podcastTextInputClass}
                />
              </Field>

              <Field label="Runtime (minutes)" hint="Optional episode length in whole minutes.">
                <input
                  name="runtimeMinutes"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="45"
                  className={podcastTextInputClass}
                />
              </Field>

              <Field
                label="Status"
                hint="Published requires a cover and audio on the Assets step."
              >
                <AdminSelect
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "Draft", label: "Draft" },
                    { value: "Review", label: "Review" },
                    { value: "Scheduled", label: "Scheduled" },
                    { value: "Published", label: "Published" },
                  ]}
                  className={podcastSelectClass}
                  aria-label="Status"
                />
                <input type="hidden" name="status" value={status} />
              </Field>

              <Field
                label="Access"
                hint={
                  access === "free"
                    ? "Anyone can listen without a subscription."
                    : "Unlocks with any active subscription plan."
                }
              >
                <AdminSelect
                  value={access}
                  onChange={(v) => setAccess(v as PodcastAccess)}
                  options={[...PODCAST_ACCESS_OPTIONS]}
                  className={podcastSelectClass}
                  aria-label="Access"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea
                    name="description"
                    rows={5}
                    placeholder="Short synopsis for the podcast listing."
                    className={`${podcastTextInputClass} resize-y`}
                  />
                </Field>
              </div>
            </div>

            {detailsError ? (
              <p className="mt-4 text-xs font-semibold text-warning">{detailsError}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button href="/podcast" variant="secondary">
                Cancel
              </Button>
              <Button type="button" variant="secondary" onClick={handleSaveDraftClick} disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save draft"}
              </Button>
              <Button type="button" onClick={() => goToStep(1)}>
                Continue
              </Button>
            </div>
          </AdminCard>
        </div>

        <div className={step === 1 ? "block" : "hidden"} aria-hidden={step !== 1}>
          <AdminCard title="Upload assets">
            <p className="mb-5 text-sm text-text-muted">
              Attach cover art and the audio file. Audio is stored on R2 as-is — no transcoder.
            </p>
            <div className="space-y-4">
              <Field label="Cover image" hint="Required for Published. Optional when saving a draft.">
                <input name="poster" type="file" accept="image/*" className={podcastFileInputClass} />
              </Field>
              <Field
                label="Audio file"
                hint="mp3, m4a, wav, or aac. Required for Published."
              >
                <input
                  name="audio"
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/aac,audio/*"
                  className={podcastFileInputClass}
                />
              </Field>
            </div>

            {submitError ? (
              <p className="mt-4 text-xs font-semibold text-warning">{submitError}</p>
            ) : null}
            {currentJob && currentJob.status !== "done" ? (
              <div className="mt-4 rounded-lg border border-border bg-bg p-3">
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
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => goToStep(0)}>
                Back
              </Button>
              <Button type="button" variant="secondary" onClick={handleSaveDraftClick} disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save draft"}
              </Button>
              <Button type="submit" variant="success" loading={isSubmitting} disabled={isSubmitting}>
                {isSubmitting ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </AdminCard>
        </div>
      </form>
    </AdminShell>
  );
}
