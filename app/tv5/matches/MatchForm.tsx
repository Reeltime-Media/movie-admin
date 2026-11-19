"use client";

import { ImageIcon, Trash2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { AdminCard } from "../../components/AdminCard";
import { AdminMediaThumb } from "../../components/AdminMediaThumb";
import { AdminSelect } from "../../components/AdminSelect";
import { AssetPicker } from "../../components/AssetPicker";
import { BackButton } from "../../components/BackButton";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Field, Input, Textarea } from "../../components/ui/Field";
import {
  createAdminMovieDraft,
  deleteAdminMovie,
  updateAdminMovie,
  uploadAdminMovieAssets,
  type ApiContent,
  type ApiMatchDetails,
} from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { WINNER_LABELS, matchup } from "./matchFormat";

type Draft = {
  red: string;
  blue: string;
  title: string;
  /** False until the admin types their own title; until then it follows the fighters. */
  titleEdited: boolean;
  event: string;
  weightClass: string;
  date: string;
  winner: ApiMatchDetails["winner"];
  method: string;
  round: string;
  description: string;
  isFree: boolean;
};

const NO_WINNER = "none";

const winnerOptions = [
  { value: NO_WINNER, label: "Not decided yet" },
  ...Object.entries(WINNER_LABELS).map(([value, label]) => ({ value, label })),
];

function draftFrom(existing?: ApiContent): Draft {
  const m = existing?.match;
  return {
    red: m?.red_fighter ?? "",
    blue: m?.blue_fighter ?? "",
    title: existing?.title ?? "",
    titleEdited: Boolean(existing && m && existing.title !== matchup(m)),
    event: m?.event_name ?? "",
    weightClass: m?.weight_class ?? "",
    date: m?.match_date ?? "",
    winner: m?.winner ?? null,
    method: m?.result_method ?? "",
    round: m?.result_round ? String(m.result_round) : "",
    description: existing?.description ?? "",
    isFree: Boolean(existing?.is_free),
  };
}

function fightCard(draft: Draft): ApiMatchDetails {
  return {
    red_fighter: draft.red.trim(),
    blue_fighter: draft.blue.trim(),
    event_name: draft.event.trim() || null,
    weight_class: draft.weightClass.trim() || null,
    match_date: draft.date || null,
    winner: draft.winner,
    result_method: draft.winner ? draft.method.trim() || null : null,
    result_round: draft.winner && draft.round ? Number(draft.round) : null,
  };
}

/** Create or edit a Kun Khmer match: fight card, access, poster and video. */
export function MatchForm({ existing }: { existing?: ApiContent }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(existing));
  const [poster, setPoster] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [saving, setSaving] = useState<null | "draft" | "publish" | "save">(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** Set once a new match exists, so retrying after a failed upload doesn't create another. */
  const [createdId, setCreatedId] = useState<string | null>(null);

  const isNew = !existing;
  const isPublished = existing?.status === "published";
  const title = draft.titleEdited ? draft.title : matchup({ red_fighter: draft.red, blue_fighter: draft.blue });
  const fightersMissing = !draft.red.trim() || !draft.blue.trim();
  const roundInvalid = draft.round !== "" && !(Number(draft.round) >= 1 && Number(draft.round) <= 20);
  const hasPoster = Boolean(poster || existing?.poster_key);
  const hasVideo = Boolean(video || existing?.hls_master_key || existing?.transcode_status === "processing");

  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));

  const save = async (status: "draft" | "published", mode: "draft" | "publish" | "save") => {
    if (fightersMissing) {
      toast.error("Enter both fighters.");
      return;
    }
    if (roundInvalid) {
      toast.error("Round must be a number from 1 to 20.");
      return;
    }
    if (status === "published" && (!hasPoster || !hasVideo)) {
      toast.error("Add a poster and a video before publishing.");
      return;
    }
    setSaving(mode);
    try {
      let id = existing?.id ?? createdId ?? undefined;
      if (!id) {
        setProgress("Creating match…");
        const created = await createAdminMovieDraft({
          title: title.trim(),
          app: "tv5",
          match: fightCard(draft),
          description: draft.description.trim() || undefined,
          genres: ["Kun Khmer"],
          priceUsd: "0",
        });
        id = created.id;
        setCreatedId(created.id);
      }
      if (poster || video) {
        setProgress(video ? "Uploading video… 0%" : "Uploading poster…");
        await uploadAdminMovieAssets(id, { poster, video }, (percent) =>
          setProgress(`Uploading video… ${percent}%`),
        );
      }
      setProgress("Saving…");
      await updateAdminMovie(id, {
        title: title.trim(),
        description: draft.description.trim() || null,
        genres: ["Kun Khmer"],
        status,
        match: fightCard(draft),
        isFree: draft.isFree,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tv5Matches });
      toast.success(
        status === "published" && !isPublished
          ? "Match published"
          : isNew
            ? "Match saved as draft"
            : "Match saved",
      );
      router.push("/tv5/matches");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this match.");
    } finally {
      setSaving(null);
      setProgress(null);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setDeleting(true);
    try {
      await deleteAdminMovie(existing.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tv5Matches });
      toast.success("Match deleted");
      router.push("/tv5/matches");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this match.");
      setDeleting(false);
    }
  };

  const busy = saving !== null;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save(isNew ? "published" : isPublished ? "published" : "draft", isNew ? "publish" : "save");
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton href="/tv5/matches" label="Back to Kun Khmer" />
        {existing ? (
          <Button
            type="button"
            variant="danger-soft"
            size="sm"
            icon={<Trash2 size={14} aria-hidden />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete match
          </Button>
        ) : null}
      </div>

      <AdminCard title="Fight card">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Red corner" htmlFor="match-red">
            <Input
              id="match-red"
              value={draft.red}
              onChange={(e) => patch({ red: e.target.value })}
              placeholder="Moeun Sokhuch"
              autoFocus={isNew}
            />
          </Field>
          <Field label="Blue corner" htmlFor="match-blue">
            <Input
              id="match-blue"
              value={draft.blue}
              onChange={(e) => patch({ blue: e.target.value })}
              placeholder="Ahmad Masouminia"
            />
          </Field>
          <Field
            label="Title"
            htmlFor="match-title"
            hint={draft.titleEdited ? "Clear it to use the fighters' names again." : "Filled in from the fighters."}
            className="md:col-span-2"
          >
            <Input
              id="match-title"
              value={title}
              onChange={(e) =>
                patch({ title: e.target.value, titleEdited: e.target.value.trim() !== "" })
              }
              placeholder="Red corner vs Blue corner"
            />
          </Field>
          <Field label="Event" htmlFor="match-event" hint="Optional">
            <Input
              id="match-event"
              value={draft.event}
              onChange={(e) => patch({ event: e.target.value })}
              placeholder="TV5 Kun Khmer Battle"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Weight class" htmlFor="match-weight" hint="Optional">
              <Input
                id="match-weight"
                value={draft.weightClass}
                onChange={(e) => patch({ weightClass: e.target.value })}
                placeholder="67 kg"
              />
            </Field>
            <Field label="Match date" htmlFor="match-date" hint="Optional">
              <Input
                id="match-date"
                type="date"
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Result">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Outcome">
            <AdminSelect
              aria-label="Outcome"
              value={draft.winner ?? NO_WINNER}
              onChange={(value) =>
                patch({ winner: value === NO_WINNER ? null : (value as ApiMatchDetails["winner"]) })
              }
              options={winnerOptions}
            />
          </Field>
          <Field label="Method" htmlFor="match-method" hint="KO, TKO, Decision…">
            <Input
              id="match-method"
              value={draft.method}
              disabled={!draft.winner}
              onChange={(e) => patch({ method: e.target.value })}
              placeholder="KO"
            />
          </Field>
          <Field
            label="Round"
            htmlFor="match-round"
            error={roundInvalid ? "Enter a round from 1 to 20." : null}
          >
            <Input
              id="match-round"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={draft.round}
              disabled={!draft.winner}
              error={roundInvalid}
              onChange={(e) => patch({ round: e.target.value })}
              placeholder="3"
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard title="Details and access">
        <div className="space-y-4">
          <Field label="Description" htmlFor="match-description" hint="Optional">
            <Textarea
              id="match-description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Main event of the night."
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-text-muted">Who can watch</legend>
            <div className="flex flex-wrap gap-2">
              {[
                { free: false, label: "TV5 subscribers", hint: "Needs an active TV5 plan" },
                { free: true, label: "Everyone", hint: "Free, no plan needed" },
              ].map((option) => (
                <label
                  key={option.label}
                  className={[
                    "flex min-w-48 cursor-pointer flex-col rounded-lg border px-3 py-2 text-sm transition-colors",
                    draft.isFree === option.free
                      ? "border-brand bg-brand-soft text-text"
                      : "border-border text-text-muted hover:border-border-hover",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="match-access"
                      checked={draft.isFree === option.free}
                      onChange={() => patch({ isFree: option.free })}
                    />
                    {option.label}
                  </span>
                  <span className="pl-5 text-xs text-text-muted">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </AdminCard>

      <AdminCard title="Poster and video">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            {existing?.poster_key && !poster ? (
              <AdminMediaThumb
                objectKey={existing.poster_key}
                alt="Current poster"
                className="aspect-2/3 w-28 rounded-lg border-0"
              />
            ) : null}
            <AssetPicker
              name="poster"
              accept="image/*"
              label={existing?.poster_key ? "Replace poster" : "Poster image"}
              hint="Portrait image. Required to publish."
              previewAspect="poster"
              icon={<ImageIcon size={20} aria-hidden />}
              file={poster}
              onFileChange={setPoster}
            />
          </div>
          <div className="space-y-2">
            {existing ? (
              <p className="text-xs text-text-muted">
                {existing.hls_master_key
                  ? "Video is ready to stream."
                  : existing.transcode_status === "processing" || existing.transcode_status === "pending"
                    ? "Video is being processed."
                    : "No video yet."}
              </p>
            ) : null}
            <AssetPicker
              name="video"
              accept="video/*"
              label={existing?.hls_master_key ? "Replace video" : "Match video"}
              hint="MP4 or MOV. Required to publish."
              icon={<Video size={20} aria-hidden />}
              file={video}
              onFileChange={setVideo}
            />
          </div>
        </div>
      </AdminCard>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {progress ? <p className="mr-auto text-sm text-text-muted">{progress}</p> : null}
        {isNew || !isPublished ? (
          <Button
            type="button"
            variant="secondary"
            loading={saving === "draft"}
            disabled={busy}
            onClick={() => void save("draft", "draft")}
          >
            Save draft
          </Button>
        ) : null}
        {isNew || !isPublished ? (
          <Button
            type="button"
            loading={saving === "publish"}
            disabled={busy}
            onClick={() => void save("published", "publish")}
          >
            Publish
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              loading={saving === "draft"}
              disabled={busy}
              onClick={() => void save("draft", "draft")}
            >
              Unpublish
            </Button>
            <Button type="submit" loading={saving === "save"} disabled={busy}>
              Save changes
            </Button>
          </>
        )}
      </div>

      {confirmDelete && existing ? (
        <Dialog
          title="Delete match"
          description={`Delete “${existing.title}”? Its video and fight card are removed and can't be restored.`}
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" loading={deleting} onClick={() => void remove()}>
                Delete match
              </Button>
            </>
          }
        />
      ) : null}
    </form>
  );
}
