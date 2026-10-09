"use client";

import { useState } from "react";
import { mediaUrl } from "../lib/media";

type AdminMediaThumbProps = {
  objectKey?: string | null;
  alt?: string;
  className?: string;
  /** Extra keys to try if the primary image fails or is missing. */
  fallbackKeys?: Array<string | null | undefined>;
  emptyLabel?: string;
};

/**
 * Small admin list thumbnail. Loads the CDN URL directly (no Next image
 * optimizer) so thumbs keep working even when a new R2 host isn't listed in
 * remotePatterns yet.
 */
export function AdminMediaThumb({
  objectKey,
  alt = "",
  className = "h-20 w-14",
  fallbackKeys = [],
  emptyLabel = "No poster",
}: AdminMediaThumbProps) {
  const candidates = [objectKey, ...fallbackKeys]
    .map((key) => mediaUrl(key))
    .filter((url): url is string => Boolean(url));

  const [index, setIndex] = useState(0);
  const src = candidates[index] ?? null;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbs: avoid optimizer host allowlist breakage
        <img
          key={src}
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => {
            setIndex((prev) => prev + 1);
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-1 text-center text-2xs text-text-disabled">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
