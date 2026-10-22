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

/** Official REELTIME logo asset — never use a letter “R” placeholder. */
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
      className={["object-contain", className].filter(Boolean).join(" ")}
      style={{ height, width: "auto" }}
    />
  );
}

/** Sidebar / auth lockup: official mark + Cinema console label. */
export function BrandWordmark({
  href = "/",
  onNavigate,
  subtitle = "Cinema console",
}: {
  href?: string;
  onNavigate?: () => void;
  subtitle?: string;
}) {
  return (
    <Link href={href} onClick={onNavigate} className="group block leading-none">
      <div className="flex items-center gap-3">
        <BrandLogo variant="mark" height={36} priority className="shrink-0" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold tracking-[0.18em] text-text">
            REELTIME
          </div>
          {subtitle ? (
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
