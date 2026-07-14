import type { ReactNode } from "react";
import { adminBadgeClass, type AdminBadgeTone } from "../../lib/adminUi";

export function Badge({
  tone = "muted",
  className = "",
  children,
}: {
  tone?: AdminBadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={[adminBadgeClass(tone), className].filter(Boolean).join(" ")}>{children}</span>
  );
}
