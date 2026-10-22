"use client";

import { useEffect, useState, type ReactNode } from "react";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type AssetPickerProps = {
  name?: string;
  accept: string;
  label: string;
  hint: string;
  icon: ReactNode;
  previewAspect?: "poster" | "banner";
  file: File | null;
  onFileChange: (file: File | null) => void;
};

export function AssetPicker({
  name,
  accept,
  label,
  hint,
  icon,
  previewAspect,
  file,
  onFileChange,
}: AssetPickerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <label className="block cursor-pointer">
      <span className="mb-1.5 block text-2xs font-semibold uppercase tracking-[0.12em] text-text-disabled">
        {label}
      </span>
      <div
        className={[
          "flex gap-3 rounded-xl border border-dashed border-border bg-bg/50 p-3 transition-colors hover:border-border-hover hover:bg-surface-elevated/40",
          file ? "border-brand/35 bg-brand-soft/20" : "",
        ].join(" ")}
      >
        <div
          className={[
            "relative shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated",
            previewAspect === "banner" ? "aspect-video w-36" : "aspect-2/3 w-20",
          ].join(" ")}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-text-disabled">{icon}</div>
          )}
        </div>
        <div className="min-w-0 flex-1 self-center">
          <p className="truncate text-sm font-semibold text-text">
            {file ? file.name : "Choose a file"}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {file ? formatBytes(file.size) : hint}
          </p>
        </div>
      </div>
      <input
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const next = e.target.files?.[0] ?? null;
          onFileChange(next && next.size > 0 ? next : null);
        }}
      />
    </label>
  );
}
