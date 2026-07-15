"use client";

import { Button } from "./ui/Button";

function youtubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function TrailerPreview({
  url,
  className,
}: {
  url?: string | null;
  className?: string;
}) {
  if (!url) return null;

  const embedUrl = youtubeEmbedUrl(url);

  return (
    <div
      className={[
        "mt-4 overflow-hidden rounded-xl border border-border bg-[#0a0a0a]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="grid h-5 w-5 place-items-center rounded-full bg-brand/20">
            <svg className="h-2.5 w-2.5 fill-brand" viewBox="0 0 10 10">
              <path d="M2 1.5l6 3.5-6 3.5V1.5z" />
            </svg>
          </div>
          <span className="text-2xs font-bold uppercase tracking-[0.12em] text-white/50">
            Trailer preview
          </span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-2xs font-semibold text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open
        </a>
      </div>

      {embedUrl ? (
        <div className="relative">
          <iframe
            key={embedUrl}
            src={embedUrl}
            title="Trailer preview"
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/5">
            <svg className="h-5 w-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/40">Non-YouTube URL</p>
            <Button href={url} target="_blank" rel="noreferrer" size="sm" className="mt-1.5">
              Open trailer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
