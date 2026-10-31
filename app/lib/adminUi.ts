export const adminPageStackClass = "space-y-6";

/** Stats sit in one hairline-divided strip rather than a row of separate boxes. */
export const adminStatGridClass =
  "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-4";

export const adminStatCardClass = "bg-surface p-5";

export const adminLabelClass = "mb-1.5 block text-xs font-medium text-text-muted";

export const adminInputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-disabled hover:border-border-hover focus:border-brand focus:ring-3 focus:ring-brand/10";

export const adminFilterBarClass =
  "mb-5 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between";

export const adminTableWrapClass = "overflow-x-auto";

export const adminTableClass = "w-full min-w-[720px] text-left text-sm";

export const adminTableHeadRowClass = "border-b border-border text-xs text-text-muted";

export const adminThClass = "px-5 pb-2.5 pt-1 font-medium";

export const adminTdClass = "px-5 py-3";

/** Table body row: subtle divider + hover for scannability. */
export const adminTrClass =
  "border-b border-border/70 transition-colors last:border-b-0 hover:bg-surface-soft";

/** Numeric/amount table cell: right-aligned so figures line up. */
export const adminTdNumClass = "px-5 py-3 text-right tabular-nums";

/** Status reads as a dot and a word, so a table of statuses stays calm. */
export const adminBadgeBase =
  "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium capitalize before:size-1.5 before:shrink-0 before:rounded-full";

export type AdminBadgeTone = "success" | "warning" | "danger" | "brand" | "muted";

const badgeToneClass: Record<AdminBadgeTone, string> = {
  success: "text-text before:bg-success",
  warning: "text-warning before:bg-warning",
  danger: "text-danger before:bg-danger",
  brand: "text-brand before:bg-brand",
  muted: "text-text-muted before:bg-text-disabled",
};

export function adminBadgeClass(tone: AdminBadgeTone) {
  return `${adminBadgeBase} ${badgeToneClass[tone]}`;
}

export function adminTabClass(active: boolean) {
  return [
    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? "bg-surface-elevated text-text"
      : "text-text-muted hover:bg-surface-elevated hover:text-text",
  ].join(" ");
}

export function adminUnderlineTabClass(active: boolean) {
  return [
    "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
    active
      ? "border-brand text-text"
      : "border-transparent text-text-muted hover:text-text",
  ].join(" ");
}

export const adminPrimaryButtonClass =
  "rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover disabled:opacity-50";

export const adminGhostButtonClass =
  "rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:cursor-not-allowed disabled:opacity-40";

export const adminDeleteButtonClass =
  "rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40";

export const adminDeleteButtonClassWide =
  "rounded-lg px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40";

export const adminDeleteConfirmButtonClass =
  "rounded-lg bg-danger px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/90 disabled:opacity-50";

export const adminPaginationWrapClass =
  "mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4";

export const adminPaginationInsetCardClass = "-mx-5 px-5";

export const adminPaginationInsetPanelClass = "-mx-6 px-6";

export const adminPaginationPageClass =
  "inline-flex min-w-12 items-center justify-center px-1 text-xs tabular-nums text-text-muted";
