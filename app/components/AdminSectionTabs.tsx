"use client";

import { adminUnderlineTabClass } from "../lib/adminUi";

export type AdminSectionTab = {
  key: string;
  label: string;
  badge?: string | number;
};

type AdminSectionTabsProps = {
  tabs: AdminSectionTab[];
  active: string;
  onChange: (key: string) => void;
  /** Accessible label for the tablist */
  label?: string;
  /** Omit the bottom border (when the parent already provides one) */
  bare?: boolean;
};

export function AdminSectionTabs({
  tabs,
  active,
  onChange,
  label = "Sections",
  bare = false,
}: AdminSectionTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={[
        "flex flex-wrap gap-1 overflow-x-auto",
        bare ? "" : "border-b border-border",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={adminUnderlineTabClass(isActive)}
          >
            {tab.label}
            {tab.badge != null && tab.badge !== "" ? (
              <span
                className={[
                  "ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums",
                  isActive ? "bg-brand/15 text-brand" : "bg-surface-elevated text-text-muted",
                ].join(" ")}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
