"use client";

import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { uploadAdminHeroMedia } from "../lib/api";

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[13px] text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10";

type HeroVideoFieldProps = {
  videoKey: string;
  youtubeUrl: string;
  onVideoKeyChange: (key: string) => void;
  onYoutubeUrlChange: (url: string) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  required?: boolean;
};

export function HeroVideoField({
  videoKey,
  youtubeUrl,
  onVideoKeyChange,
  onYoutubeUrlChange,
  disabled,
  onUploadingChange,
  required,
}: HeroVideoFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    onUploadingChange?.(true);
    setProgress(0);
    try {
      const key = await uploadAdminHeroMedia("video", file, setProgress);
      onVideoKeyChange(key);
      onYoutubeUrlChange("");
      toast.success("Video uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video upload failed.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-[11px] font-semibold text-text-muted">
        Hero video{required ? <span className="text-brand"> *</span> : " (optional)"}
      </label>
      <p className="text-[11px] text-text-disabled">
        Autoplays muted in the hero. Short clips work best (≤ 30s, ≤ 50 MB, MP4 or
        WebM). Uploading a file replaces any YouTube link.
      </p>
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm"
          disabled={disabled || uploading}
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          className="block w-full text-[12px] text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-elevated file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-text"
        />
        {uploading ? (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-text-muted">Uploading… {progress}%</p>
          </div>
        ) : videoKey ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="truncate text-[11px] text-success">Uploaded: {videoKey}</span>
            <button
              type="button"
              onClick={() => onVideoKeyChange("")}
              disabled={disabled}
              className="shrink-0 text-[11px] font-semibold text-text-muted hover:text-text"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold text-text-muted">
          Or YouTube URL
        </label>
        <input
          type="url"
          value={youtubeUrl}
          placeholder="https://www.youtube.com/watch?v=…"
          disabled={disabled || uploading || Boolean(videoKey)}
          onChange={(e) => onYoutubeUrlChange(e.target.value)}
          className={`${inputClass} disabled:opacity-40`}
        />
        {videoKey ? (
          <p className="mt-1 text-[11px] text-text-disabled">
            Remove the uploaded video to use a YouTube link instead.
          </p>
        ) : null}
      </div>
    </div>
  );
}
