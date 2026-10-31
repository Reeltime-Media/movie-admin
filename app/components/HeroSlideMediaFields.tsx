"use client";

import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { AdminMediaThumb } from "./AdminMediaThumb";
import { uploadAdminHeroMedia } from "../lib/api";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10";

type HeroBannerFieldProps = {
  bannerKey: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
};

export function HeroBannerField({
  bannerKey,
  onChange,
  disabled,
  onUploadingChange,
}: HeroBannerFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    onUploadingChange?.(true);
    setProgress(0);
    try {
      const key = await uploadAdminHeroMedia("banner", file, setProgress);
      onChange(key);
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-2xs font-semibold text-text-muted">
        Hero image<span className="text-danger"> *</span>
      </label>
      <p className="text-2xs text-text-disabled">
        Ultrawide 12:5 artwork (1920×800) fills the carousel; other shapes get cropped.
        JPG, PNG or WebP.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {/* Same 12:5 shape as the client hero */}
        <AdminMediaThumb objectKey={bannerKey || null} className="h-20 w-48" emptyLabel="No image" />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-elevated file:px-3 file:py-1.5 file:text-2xs file:font-medium file:text-text"
          />
          {uploading ? (
            <div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-2xs text-text-muted">Uploading… {progress}%</p>
            </div>
          ) : bannerKey ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={disabled}
              className="text-2xs font-semibold text-text-muted hover:text-text"
            >
              Remove image
            </button>
          ) : null}
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
      <label className="block text-2xs font-semibold text-text-muted">
        Hero video{required ? <span className="text-danger"> *</span> : " (optional)"}
      </label>
      <p className="text-2xs text-text-disabled">
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
          className="block w-full text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-elevated file:px-3 file:py-1.5 file:text-2xs file:font-medium file:text-text"
        />
        {uploading ? (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-2xs text-text-muted">Uploading… {progress}%</p>
          </div>
        ) : videoKey ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="truncate text-2xs text-success">Uploaded: {videoKey}</span>
            <button
              type="button"
              onClick={() => onVideoKeyChange("")}
              disabled={disabled}
              className="shrink-0 text-2xs font-semibold text-text-muted hover:text-text"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>
      <div>
        <label className="mb-1.5 block text-2xs font-semibold text-text-muted">
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
          <p className="mt-1 text-2xs text-text-disabled">
            Remove the uploaded video to use a YouTube link instead.
          </p>
        ) : null}
      </div>
    </div>
  );
}
