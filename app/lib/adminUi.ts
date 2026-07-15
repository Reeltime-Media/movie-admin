export const adminPageStackClass = "space-y-6";

export const adminStatGridClass = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";

export const adminStatCardClass = "rounded-xl border border-border bg-surface p-5";

export const adminLabelClass =
  "mb-1.5 block text-2xs font-semibold uppercase tracking-[0.16em] text-text-disabled";

export const adminInputClass =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-disabled hover:border-border-hover focus:border-brand/60 focus:bg-surface";

export const adminFilterBarClass =
  "mb-5 flex flex-col gap-3 border-b border-border pb-5";

export const adminTableWrapClass = "overflow-x-auto";

export const adminTableClass = "w-full min-w-[720px] text-left text-sm";

export const adminTableHeadRowClass =
  "border-b border-border text-2xs font-semibold uppercase tracking-[0.16em] text-text-disabled";

export const adminThClass = "px-5 pb-2.5 pt-1 font-semibold";

export const adminTdClass = "px-5 py-3";

/** Table body row: subtle divider + hover for scannability. */
export const adminTrClass = "border-b border-border/60 transition-colors hover:bg-surface-elevated";

/** Numeric/amount table cell: right-aligned, mono figures line up. */
export const adminTdNumClass = "px-5 py-3 text-right font-mono tabular-nums";

export const adminBadgeBase =
  "inline-flex items-center rounded-lg px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.1em]";

export type AdminBadgeTone = "success" | "warning" | "danger" | "brand" | "muted";

const badgeToneClass: Record<AdminBadgeTone, string> = {
  success: "bg-success/10 text-success ring-1 ring-inset ring-success/25",
  warning: "bg-warning/10 text-warning ring-1 ring-inset ring-warning/25",
  danger: "bg-danger/10 text-danger ring-1 ring-inset ring-danger/25",
  brand: "bg-brand/10 text-brand ring-1 ring-inset ring-brand/30",
  muted: "bg-text-disabled/10 text-text-muted ring-1 ring-inset ring-text-disabled/25",
};

export function adminBadgeClass(tone: AdminBadgeTone) {
  return `${adminBadgeBase} ${badgeToneClass[tone]}`;
}

export function adminTabClass(active: boolean) {
  return [
    "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
    active
      ? "border border-brand/40 bg-brand-soft text-text"
      : "border border-border bg-surface text-text-muted hover:border-border-hover hover:bg-surface-elevated hover:text-text",
  ].join(" ");
}

export function adminUnderlineTabClass(active: boolean) {
  return [
    "-mb-px border-b-2 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors",
    active
      ? "border-brand text-brand"
      : "border-transparent text-text-muted hover:text-text",
  ].join(" ");
}

export const adminPrimaryButtonClass =
  "rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50";

export const adminGhostButtonClass =
  "rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-border-hover hover:bg-surface-elevated hover:text-text disabled:cursor-not-allowed disabled:opacity-40";

export const adminDeleteButtonClass =
  "rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-2xs font-semibold text-danger transition-colors hover:border-danger/55 hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40";

export const adminDeleteButtonClassWide =
  "rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-2xs font-semibold text-danger transition-colors hover:border-danger/55 hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40";

export const adminDeleteConfirmButtonClass =
  "rounded-lg bg-danger px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-danger/90 disabled:opacity-50";

export const adminPaginationWrapClass =
  "mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4";

export const adminPaginationInsetCardClass = "-mx-5 px-5";

export const adminPaginationInsetPanelClass = "-mx-6 px-6";

export const adminPaginationPageClass =
  "inline-flex min-w-[4.25rem] items-center justify-center rounded-lg border border-border bg-surface-soft px-3 py-1.5 text-xs font-semibold tabular-nums text-text";
