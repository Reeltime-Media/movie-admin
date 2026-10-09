"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import {
  getAdminRebuildSourceFromHlsStatus,
  getAdminSourceVideoDownload,
  SourceVideoMissingError,
  startAdminRebuildSourceFromHls,
} from "../lib/api";
import { Button } from "./ui/Button";

type AdminDownloadSourceButtonProps = {
  contentId: string;
  /** Shown in toasts; also used as a fallback download name. */
  label?: string;
  size?: "sm" | "md";
  variant?: "secondary" | "ghost";
  className?: string;
};

const POLL_MS = 2500;
const MAX_WAIT_MS = 20 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function triggerBrowserDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function AdminDownloadSourceButton({
  contentId,
  label = "video",
  size = "sm",
  variant = "secondary",
  className,
}: AdminDownloadSourceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setBuilding(false);
    try {
      try {
        const { url, filename } = await getAdminSourceVideoDownload(contentId);
        triggerBrowserDownload(url, filename || `${label}.mp4`);
        toast.success("Download started");
        return;
      } catch (err) {
        if (!(err instanceof SourceVideoMissingError) || !err.canRebuildFromHls) {
          throw err;
        }
      }

      setBuilding(true);
      toast.info("No original file — building MP4 from HLS…");
      const started = await startAdminRebuildSourceFromHls(contentId);

      if (started.status === "already_exists" || !started.export_id) {
        const { url, filename } = await getAdminSourceVideoDownload(contentId);
        triggerBrowserDownload(url, filename || `${label}.mp4`);
        toast.success("Download started");
        return;
      }

      const deadline = Date.now() + MAX_WAIT_MS;
      while (Date.now() < deadline) {
        await sleep(POLL_MS);
        const status = await getAdminRebuildSourceFromHlsStatus(
          contentId,
          started.export_id,
        );
        if (status.status === "success") {
          const { url, filename } = await getAdminSourceVideoDownload(contentId);
          triggerBrowserDownload(url, filename || `${label}.mp4`);
          toast.success("MP4 ready — download started");
          return;
        }
        if (status.status === "failed") {
          throw new Error(status.error || "HLS to MP4 rebuild failed");
        }
      }
      throw new Error("Timed out waiting for HLS to MP4 rebuild");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download source video");
    } finally {
      setLoading(false);
      setBuilding(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      loading={loading}
      icon={<Download size={14} aria-hidden />}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        void handleDownload();
      }}
    >
      {building ? "Building…" : "Download"}
    </Button>
  );
}
