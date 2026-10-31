import Image from "next/image";
import Link from "next/link";

const MARK_SRC = "/brand/logo-mark.png";
const FULL_SRC = "/brand/logo-full.png";

type BrandLogoProps = {
  /** Compact R mark (sidebar / inline). */
  variant?: "mark" | "full";
  /** Logical height in px. */
  height?: number;
  className?: string;
  priority?: boolean;
};

/** Official REELTIME logo asset (white PNG, darkened in the light theme) — never use a letter “R” placeholder. */
export function BrandLogo({
  variant = "mark",
  height = 36,
  className,
  priority = false,
}: BrandLogoProps) {
  const src = variant === "full" ? FULL_SRC : MARK_SRC;
  const width = variant === "full" ? Math.round(height * 1.5) : height;

  return (
    <Image
      src={src}
      alt="REELTIME"
      width={width}
      height={height}
      priority={priority}
      className={["object-contain light:brightness-0", className].filter(Boolean).join(" ")}
      style={{ height, width: "auto" }}
    />
  );
}

/** Sidebar lockup: official mark + product name. */
export function BrandWordmark({
  href = "/",
  onNavigate,
  subtitle = "Admin",
}: {
  href?: string;
  onNavigate?: () => void;
  subtitle?: string;
}) {
  return (
    <Link href={href} onClick={onNavigate} className="flex items-center gap-2.5 leading-none">
      <BrandLogo variant="mark" height={22} priority className="shrink-0" />
      <span className="truncate text-sm font-semibold text-text">Reeltime</span>
      {subtitle ? <span className="text-sm text-text-muted">{subtitle}</span> : null}
    </Link>
  );
}
