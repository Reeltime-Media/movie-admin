"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { getAdminSourceVideoDownload } from "../lib/api";
import { Button } from "./ui/Button";

type AdminDownloadSourceButtonProps = {
  contentId: string;
  /** Shown in toasts; also used as a fallback download name. */
  label?: string;
  size?: "sm" | "md";
  variant?: "secondary" | "ghost";
  className?: string;
};

export function AdminDownloadSourceButton({
  contentId,
  label = "video",
  size = "sm",
  variant = "secondary",
  className,
}: AdminDownloadSourceButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { url, filename } = await getAdminSourceVideoDownload(contentId);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `${label}.mp4`;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download source video");
    } finally {
      setLoading(false);
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
      Download
    </Button>
  );
}
