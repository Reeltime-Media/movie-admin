export const adminPageStackClass = "space-y-6";

export const adminStatGridClass = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";

export const adminStatCardClass = "rounded-lg border border-border bg-surface p-5";

export const adminLabelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-text-disabled";

export const adminInputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated";

export const adminFilterBarClass =
  "mb-5 flex flex-col gap-3 border-b border-border pb-5";

export const adminTableWrapClass = "overflow-x-auto";

export const adminTableClass = "w-full min-w-[720px] text-left text-[13px]";

export const adminTableHeadRowClass =
  "border-b border-border text-[11px] uppercase tracking-[0.12em] text-text-disabled";

export const adminThClass = "px-5 pb-3 font-bold";

export const adminTdClass = "px-5 py-3.5";

export const adminBadgeBase =
  "inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]";

export type AdminBadgeTone = "success" | "warning" | "danger" | "brand" | "muted";

const badgeToneClass: Record<AdminBadgeTone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  brand: "bg-brand/15 text-brand",
  muted: "bg-text-disabled/20 text-text-muted",
};

export function adminBadgeClass(tone: AdminBadgeTone) {
  return `${adminBadgeBase} ${badgeToneClass[tone]}`;
}

export function adminTabClass(active: boolean) {
  return [
    "rounded-md px-3 py-2 text-[12px] font-semibold transition-colors",
    active
      ? "border border-brand/40 bg-brand-soft text-text"
      : "border border-border bg-surface text-text-muted hover:border-border-hover hover:bg-surface-elevated hover:text-text",
  ].join(" ");
}

export function adminUnderlineTabClass(active: boolean) {
  return [
    "-mb-px border-b-2 px-3 py-2 text-[12px] font-semibold whitespace-nowrap transition-colors",
    active
      ? "border-brand text-brand"
      : "border-transparent text-text-muted hover:text-text",
  ].join(" ");
}

export const adminPrimaryButtonClass =
  "rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50";

export const adminGhostButtonClass =
  "rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:bg-surface-elevated hover:text-text disabled:cursor-not-allowed disabled:opacity-40";

export const adminDeleteButtonClass =
  "rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-[11px] font-semibold text-danger transition-colors hover:border-danger/55 hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40";

export const adminDeleteButtonClassWide =
  "rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[11px] font-semibold text-danger transition-colors hover:border-danger/55 hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-40";

export const adminDeleteConfirmButtonClass =
  "rounded-md bg-danger px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-danger/90 disabled:opacity-50";

export const adminPaginationWrapClass =
  "mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4";

export const adminPaginationInsetCardClass = "-mx-5 px-5";

export const adminPaginationInsetPanelClass = "-mx-6 px-6";

export const adminPaginationPageClass =
  "inline-flex min-w-[4.25rem] items-center justify-center rounded-md border border-border bg-surface-soft px-3 py-1.5 text-[12px] font-semibold tabular-nums text-text";
