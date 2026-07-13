"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { uploadAdminHeroMedia } from "../lib/api";
import { mediaUrl } from "../lib/media";

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[13px] text-text outline-none transition-all focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/10";

type HeroBannerFieldProps = {
  bannerKey: string;
  onChange: (key: string) => void;
  disabled?: boolean;
};

export function HeroBannerField({ bannerKey, onChange, disabled }: HeroBannerFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const preview = mediaUrl(bannerKey || null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const key = await uploadAdminHeroMedia("banner", file);
      onChange(key);
      toast.success("Banner uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Banner upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold text-text-muted">
        Banner image
      </label>
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-surface-elevated">
          {preview ? (
            <Image src={preview} alt="" fill className="object-cover" sizes="112px" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-text-disabled">
              No banner
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            className="block w-full text-[12px] text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-elevated file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-text"
          />
          {uploading ? (
            <p className="text-[11px] text-text-muted">Uploading…</p>
          ) : bannerKey ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={disabled}
              className="text-[11px] font-semibold text-text-muted hover:text-text"
            >
              Remove banner
            </button>
          ) : (
            <p className="text-[11px] text-text-disabled">
              Ultrawide artwork (~1920×788) looks best. Also used as the video&apos;s fallback frame.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type HeroVideoFieldProps = {
  videoKey: string;
  youtubeUrl: string;
  onVideoKeyChange: (key: string) => void;
  onYoutubeUrlChange: (url: string) => void;
  disabled?: boolean;
};

export function HeroVideoField({
  videoKey,
  youtubeUrl,
  onVideoKeyChange,
  onYoutubeUrlChange,
  disabled,
}: HeroVideoFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
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
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-[11px] font-semibold text-text-muted">
        Hero video (optional)
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
          disabled={disabled || Boolean(videoKey)}
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
