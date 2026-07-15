"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminSourceVideoUrl } from "../lib/api";

type AdminSourceVideoPlayerProps = {
  contentId: string;
  title: string;
  hasVideo?: boolean;
};

export function AdminSourceVideoPlayer({
  contentId,
  title,
  hasVideo = true,
}: AdminSourceVideoPlayerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasVideo) {
      setSrc(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSrc(null);

    getAdminSourceVideoUrl(contentId)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load source video.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contentId, hasVideo]);

  if (!hasVideo) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
        No original video uploaded.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-border bg-black text-xs text-text-muted">
        <Loader2 size={28} className="animate-spin text-white" aria-hidden />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg px-4 text-center text-xs text-text-muted">
        {error ?? "Could not load original video."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black">
      <video
        key={src}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full"
        title={`${title} (original)`}
        src={src}
      />
    </div>
  );
}
