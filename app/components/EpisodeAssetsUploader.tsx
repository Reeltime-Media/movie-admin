"use client";

import type { Season } from "../lib/adminData";

const fileInputClass =
  "mt-2 w-full rounded-lg border border-dashed border-border bg-bg px-3 py-3 text-xs text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-border-hover";

type EpisodeAssetsUploaderProps = {
  seasons: Season[];
  onChange: (next: Season[]) => void;
};

export function EpisodeAssetsUploader({ seasons, onChange }: EpisodeAssetsUploaderProps) {
  const setEpisodeAsset = (
    seasonId: string,
    episodeId: string,
    kind: "video" | "poster",
    files: FileList | null,
  ) => {
    const file = files?.[0] ?? null;
    const name = file?.name?.trim() ?? "";
    onChange(
      seasons.map((se) => {
        if (se.id !== seasonId) return se;
        return {
          ...se,
          episodes: se.episodes.map((ep) => {
            if (ep.id !== episodeId) return ep;
            if (kind === "video") {
              return { ...ep, videoFileName: name || undefined, videoFile: file ?? undefined };
            }
            return { ...ep, posterFileName: name || undefined, posterFile: file ?? undefined };
          }),
        };
      }),
    );
  };

  return (
    <div className="space-y-8">
      {seasons.map((se) => (
        <div key={se.id} className="rounded-lg border border-border bg-bg p-4">
          <div className="border-b border-border pb-2 text-sm font-bold">{se.title}</div>
          <div className="mt-4 space-y-6">
            {se.episodes.map((ep) => (
              <div
                key={ep.id}
                className="rounded-lg border border-dashed border-border/90 bg-surface/40 p-4"
              >
                <div className="text-xs font-bold text-text">
                  E{ep.number} &middot; {ep.title}
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="block text-xs font-semibold text-text-muted">Episode video</span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,application/x-mpegURL,video/*"
                      className={fileInputClass}
                      onChange={(e) => setEpisodeAsset(se.id, ep.id, "video", e.target.files)}
                    />
                    {ep.videoFileName ? (
                      <p className="mt-1 text-2xs text-text-muted">{ep.videoFileName}</p>
                    ) : null}
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-text-muted">
                      Episode poster
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className={fileInputClass}
                      onChange={(e) => setEpisodeAsset(se.id, ep.id, "poster", e.target.files)}
                    />
                    {ep.posterFileName ? (
                      <p className="mt-1 text-2xs text-text-muted">{ep.posterFileName}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
