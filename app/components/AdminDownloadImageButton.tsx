"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "./ui/Button";

type AdminDownloadImageButtonProps = {
  url: string | null | undefined;
  filename: string;
  label?: string;
  size?: "sm" | "md";
  variant?: "secondary" | "ghost";
  className?: string;
};

function triggerBrowserDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function AdminDownloadImageButton({
  url,
  filename,
  label = "Download",
  size = "sm",
  variant = "secondary",
  className,
}: AdminDownloadImageButtonProps) {
  const [loading, setLoading] = useState(false);

  if (!url) return null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerBrowserDownload(objectUrl, filename);
      URL.revokeObjectURL(objectUrl);
      toast.success("Download started");
    } catch (err) {
      // CORS / CDN may block blob fetch — open the asset as a fallback.
      window.open(url, "_blank", "noopener,noreferrer");
      toast.info(
        err instanceof Error
          ? "Opened image in a new tab — use Save image if download was blocked"
          : "Opened image in a new tab",
      );
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
      onClick={() => void handleDownload()}
    >
      {label}
    </Button>
  );
}
