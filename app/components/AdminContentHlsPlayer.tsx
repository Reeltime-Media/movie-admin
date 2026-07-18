"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminPlaybackUrl } from "../lib/api";
import { AdminHlsPlayer } from "./AdminHlsPlayer";

type AdminContentHlsPlayerProps = {
  contentId: string;
  title: string;
  /** When false, shows the empty-state placeholder instead of loading playback. */
  hasVideo: boolean;
};

export function AdminContentHlsPlayer({
  contentId,
  title,
  hasVideo,
}: AdminContentHlsPlayerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(hasVideo);

  useEffect(() => {
    if (!hasVideo) return;

    let cancelled = false;

    void (async () => {
      try {
        const url = await getAdminPlaybackUrl(contentId);
        if (!cancelled) {
          setSrc(url);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setSrc(null);
          setError(err instanceof Error ? err.message : "Could not load playback URL.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contentId, hasVideo]);

  if (!hasVideo) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border bg-bg text-center text-xs text-text-muted">
        No transcoded video yet.
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
        {error ?? "Could not load video playback."}
      </div>
    );
  }

  return <AdminHlsPlayer key={src} src={src} title={title} />;
}
