import type { ReactNode } from "react";

export function formatMovieDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function youtubeEmbedUrl(url?: string | null) {
  if (!url) return null;
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

const fieldShellClass = "rounded-md border border-border bg-bg p-4";

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className={fieldShellClass}>
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-disabled">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-semibold text-text">{value || "-"}</div>
    </div>
  );
}

export function EditField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${fieldShellClass} ${className}`.trim()}>
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-disabled">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export const movieEditInputClass =
  "w-full rounded-md border border-border bg-surface px-2.5 py-2 text-[13px] font-semibold text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover";

export const movieEditSelectClass =
  "w-full rounded-md border border-border bg-surface px-2.5 py-2 text-[13px] font-semibold text-text outline-none transition-colors focus:border-border-hover";

export const movieFileInputClass =
  "mt-3 w-full rounded-md border border-dashed border-border bg-surface px-3 py-3 text-[11px] text-text-muted file:mr-2 file:rounded-md file:border-0 file:bg-brand file:px-2.5 file:py-1.5 file:text-[11px] file:font-bold file:text-white hover:border-border-hover";
