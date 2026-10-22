"use client";

import Link from "next/link";
import { AdminCard } from "./AdminCard";
import type { ApiDashboardSummary } from "../lib/api";

type OpsItem = {
  label: string;
  value: string;
  href: string;
  tone: "default" | "warning" | "danger" | "muted";
};

function toneClass(tone: OpsItem["tone"]) {
  switch (tone) {
    case "warning":
      return "text-warning";
    case "danger":
      return "text-danger";
    case "muted":
      return "text-text-muted";
    default:
      return "text-text";
  }
}

export function DashboardOps({
  summary,
  loading,
}: {
  summary: ApiDashboardSummary | undefined;
  loading: boolean;
}) {
  const num = (n: number) => n.toLocaleString();
  const pending = summary?.transcodes.pending ?? 0;
  const processing = summary?.transcodes.processing ?? 0;
  const failed = summary?.transcodes.failed ?? 0;
  const drafts = summary?.content.drafts ?? 0;
  const review = summary?.content.review ?? 0;
  const paymentsPending = summary?.payments.pending ?? 0;

  const items: OpsItem[] = [
    {
      label: "Transcode queue",
      value: loading
        ? "--"
        : pending + processing > 0
          ? `${num(pending)} pending · ${num(processing)} processing`
          : "Clear",
      href: "/transcode",
      tone: pending > 0 || failed > 0 ? "warning" : "muted",
    },
    {
      label: "Failed transcodes",
      value: loading ? "--" : num(failed),
      href: "/transcode",
      tone: failed > 0 ? "danger" : "muted",
    },
    {
      label: "Drafts",
      value: loading ? "--" : num(drafts),
      href: "/movie",
      tone: drafts > 0 ? "default" : "muted",
    },
    {
      label: "In review",
      value: loading ? "--" : num(review),
      href: "/movie",
      tone: review > 0 ? "default" : "muted",
    },
    {
      label: "Pending payments",
      value: loading ? "--" : num(paymentsPending),
      href: "/payments",
      tone: paymentsPending > 0 ? "warning" : "muted",
    },
  ];

  return (
    <AdminCard title="Needs attention" action="Open queue" actionHref="/transcode">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="flex h-full flex-col gap-1 rounded-lg border border-border bg-bg/60 px-3 py-2.5 transition-colors hover:border-border-hover hover:bg-surface-elevated/60"
            >
              <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                {item.label}
              </span>
              <span
                className={[
                  "text-sm font-bold tabular-nums",
                  toneClass(item.tone),
                ].join(" ")}
              >
                {item.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}
