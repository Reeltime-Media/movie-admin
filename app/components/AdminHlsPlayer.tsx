"use client";

import Hls from "hls.js";
import { Loader2, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type AdminHlsPlayerProps = {
  src: string;
  title: string;
};

type QualityLevel = { height: number; bitrate: number; index: number };

export function AdminHlsPlayer({ src, title }: AdminHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [autoLevel, setAutoLevel] = useState(-1);
  const [showQuality, setShowQuality] = useState(false);

  const changeQuality = useCallback((levelIndex: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = levelIndex;
    setSelectedLevel(levelIndex);
    setShowQuality(false);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setLoading(true);
    setLevels([]);
    setSelectedLevel(-1);
    setAutoLevel(-1);
    setShowQuality(false);

    if (Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1, capLevelToPlayerSize: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setLevels(
          data.levels.map((level, index) => ({
            height: level.height || 0,
            bitrate: level.bitrate,
            index,
          })),
        );
        setLoading(false);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setAutoLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError("Could not play this video stream.");
          setLoading(false);
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      const onLoaded = () => setLoading(false);
      const onError = () => {
        setError("Could not play this video stream.");
        setLoading(false);
      };
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);
      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        video.removeAttribute("src");
      };
    }

    setError("HLS playback is not supported in this browser.");
    setLoading(false);
  }, [src]);

  useEffect(() => {
    if (!showQuality) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const root = videoRef.current?.parentElement;
      if (root && !root.contains(target)) setShowQuality(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showQuality]);

  const qualityLabel =
    selectedLevel === -1
      ? autoLevel >= 0 && levels[autoLevel]
        ? `Auto · ${levels[autoLevel].height}p`
        : "Auto"
      : levels.find((level) => level.index === selectedLevel)?.height
        ? `${levels.find((level) => level.index === selectedLevel)!.height}p`
        : "Auto";

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        className="aspect-video w-full"
        title={title}
      />

      {levels.length > 0 && !loading && !error ? (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            onClick={() => setShowQuality((open) => !open)}
            className="flex items-center gap-1 rounded-lg border border-border/60 bg-black/75 px-2 py-1 text-2xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/90"
            aria-label="Video quality"
          >
            <Settings size={13} />
            <span>{qualityLabel}</span>
          </button>

          {showQuality ? (
            <div className="absolute right-0 top-full mt-1 min-w-32 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
              <div className="px-3 pb-1 pt-2 text-2xs font-bold uppercase tracking-widest text-text-muted">
                Quality
              </div>

              <button
                type="button"
                onClick={() => changeQuality(-1)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-text transition-colors hover:bg-surface-elevated"
              >
                {selectedLevel === -1 ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                ) : (
                  <span className="h-1.5 w-1.5" />
                )}
                <span className={selectedLevel === -1 ? "text-brand" : ""}>Auto</span>
                {selectedLevel === -1 && autoLevel >= 0 && levels[autoLevel] ? (
                  <span className="ml-auto text-2xs text-text-muted">
                    {levels[autoLevel].height}p
                  </span>
                ) : null}
              </button>

              {[...levels]
                .sort((a, b) => b.height - a.height)
                .map((level) => (
                  <button
                    key={level.index}
                    type="button"
                    onClick={() => changeQuality(level.index)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-text transition-colors hover:bg-surface-elevated"
                  >
                    {selectedLevel === level.index ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    ) : (
                      <span className="h-1.5 w-1.5" />
                    )}
                    <span className={selectedLevel === level.index ? "text-brand" : ""}>
                      {level.height > 0
                        ? `${level.height}p`
                        : `${Math.round(level.bitrate / 1000)}k`}
                    </span>
                    {selectedLevel !== level.index ? (
                      <span className="ml-auto text-2xs text-text-muted">
                        {Math.round(level.bitrate / 1000)}k
                      </span>
                    ) : null}
                  </button>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {loading && !error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <Loader2 size={28} className="animate-spin text-white" aria-hidden />
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/80 px-4 text-center text-sm text-white">
          {error}
        </div>
      ) : null}
    </div>
  );
}
