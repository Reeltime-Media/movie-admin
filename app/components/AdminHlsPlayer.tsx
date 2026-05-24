"use client";

import Hls from "hls.js";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AdminHlsPlayerProps = {
  src: string;
  title: string;
};

export function AdminHlsPlayer({ src, title }: AdminHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setLoading(true);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
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

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        className="aspect-video w-full"
        title={title}
      />
      {loading && !error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <Loader2 size={28} className="animate-spin text-white" aria-hidden />
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/80 px-4 text-center text-[13px] text-white">
          {error}
        </div>
      ) : null}
    </div>
  );
}
