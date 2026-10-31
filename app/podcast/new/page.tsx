"use client";

import { Headphones, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AdminCard } from "../../components/AdminCard";
import { AdminSelect } from "../../components/AdminSelect";
import { AdminShell } from "../../components/AdminShell";
import { AssetPicker } from "../../components/AssetPicker";
import { BackButton } from "../../components/BackButton";
import { WizardSteps } from "../../components/WizardSteps";
import { Button } from "../../components/ui/Button";
import { useUploadProgress } from "../../components/UploadProgressContext";
import type { Status } from "../../lib/adminData";
import {
  createAdminPodcastDraft,
  updateAdminPodcast,
  uploadAdminPodcastAssets,
} from "../../lib/api";
import {
  PODCAST_ACCESS_OPTIONS,
  detectAudioDurationMinutes,
  formatRuntimeMinutes,
  isFreeFromPodcastAccess,
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
      <span className="mb-1.5 block text-xs font-medium text-text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}

export default function NewPodcastPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("Published");
  const [access, setAccess] = useState<PodcastAccess>("plan");
  const [detectedRuntime, setDetectedRuntime] = useState<number | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { jobs, startJob, updateJob, setJobLabel, finishJob, failJob } = useUploadProgress();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

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

    return {
      ok: true as const,
      title,
      titleKm: String(fd.get("titleKm") || "").trim(),
      isFree: isFreeFromPodcastAccess(access),
      description: String(fd.get("description") || "").trim(),
    };
  };

  const onAudioSelected = async (file: File | null) => {
    setAudioFile(file);
    if (!file || file.size === 0) {
      setDetectedRuntime(null);
      return;
    }
    const minutes = await detectAudioDurationMinutes(file);
    setDetectedRuntime(minutes ?? null);
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

    const posterFromForm = fd.get("poster");
    const audioFromForm = fd.get("audio");
    const poster =
      posterFile ??
      (posterFromForm instanceof File && posterFromForm.size > 0 ? posterFromForm : null);
    const audio =
      audioFile ??
      (audioFromForm instanceof File && audioFromForm.size > 0 ? audioFromForm : null);

    const targetStatus: Status =
      intent === "draft" ? "Draft" : toUiStatus(String(fd.get("status") || status));

    if (intent === "upload") {
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

    let runtimeMinutes = detectedRuntime ?? undefined;
    if (audio && runtimeMinutes == null) {
      runtimeMinutes = await detectAudioDurationMinutes(audio);
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
          runtimeMinutes,
          isFree: fields.isFree,
        });

        if (poster || audio) {
          setJobLabel(
            jobId,
            poster && audio
              ? "Uploading cover & audio…"
              : poster
                ? "Uploading cover…"
                : "Uploading audio…",
          );
          await uploadAdminPodcastAssets(
            created.id,
            { poster, audio },
            (pct) => updateJob(jobId, pct),
          );
        }

        if (targetStatus !== "Draft" || runtimeMinutes != null) {
          setJobLabel(jobId, "Saving…");
          await updateAdminPodcast(created.id, {
            title: fields.title,
            titleKm: fields.titleKm || null,
            description: fields.description || null,
            runtimeMinutes: runtimeMinutes ?? null,
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
  const runtimeLabel = formatRuntimeMinutes(detectedRuntime);

  return (
    <AdminShell title="Upload new podcast">
      <WizardSteps
        labels={stepLabels}
        step={step}
        onStepChange={goToStep}
        leading={<BackButton href="/podcast" label="Back to podcasts" />}
      />

      <form id="podcast-wizard-form" onSubmit={handleUploadSubmit} noValidate className="w-full space-y-6">
        <div className={step === 0 ? "block" : "hidden"} aria-hidden={step !== 0}>
          <AdminCard title="Podcast details">
            <p className="mb-5 text-sm text-text-muted">
              Set the title, access, and listing fields first. Continue to attach cover art and
              audio.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="English title">
                <input
                  name="title"
                  placeholder="Night Whispers"
                  className={podcastTextInputClass}
                />
              </Field>
              <Field label="Khmer title">
                <input name="titleKm" placeholder="Optional" className={podcastTextInputClass} />
              </Field>

              <Field
                label="Status"
                hint="Published requires a cover and audio on Assets. Save draft does not."
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

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveDraftClick}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save draft"}
              </Button>
              <Button type="button" onClick={() => goToStep(1)}>
                Continue to assets
              </Button>
            </div>
          </AdminCard>
        </div>

        <div className={step === 1 ? "block" : "hidden"} aria-hidden={step !== 1}>
          <AdminCard title="Upload assets">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-xl text-sm text-text-muted">
                Attach cover art and the audio file. Runtime is detected from the audio
                automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                <span
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                    posterFile
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-warning/40 bg-warning/10 text-warning",
                  ].join(" ")}
                >
                  {posterFile ? "Cover ready" : "Needs cover"}
                </span>
                <span
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                    audioFile
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-warning/40 bg-warning/10 text-warning",
                  ].join(" ")}
                >
                  {audioFile ? "Audio ready" : "Needs audio"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <AssetPicker
                name="poster"
                accept="image/*"
                label="Cover image"
                hint="Required for Published. Optional for draft."
                previewAspect="poster"
                icon={<ImageIcon size={20} aria-hidden />}
                file={posterFile}
                onFileChange={setPosterFile}
              />
              <AssetPicker
                name="audio"
                accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/aac,audio/*"
                label="Audio file"
                hint={
                  runtimeLabel
                    ? `Detected runtime: ${runtimeLabel}`
                    : "mp3, m4a, wav, or aac. Runtime is read from the file."
                }
                icon={<Headphones size={20} aria-hidden />}
                file={audioFile}
                onFileChange={(file) => void onAudioSelected(file)}
              />
            </div>

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
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <BackButton label="Back" onClick={() => goToStep(0)} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraftClick}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Save draft"}
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Uploading…" : "Upload podcast"}
                </Button>
              </div>
            </div>
          </AdminCard>
        </div>
      </form>
    </AdminShell>
  );
}
