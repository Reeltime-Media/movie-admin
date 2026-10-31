"use client";

import { AdminShell } from "./components/AdminShell";
import { AdminStatCard, AdminStatGrid } from "./components/AdminStatCard";
import { AdminErrorAlert } from "./components/AdminErrorAlert";
import { DashboardOps } from "./components/DashboardOps";
import { DashboardRevenue } from "./components/DashboardRevenue";
import { DashboardTopMovies } from "./components/DashboardTopMovies";
import { useDashboardSummary } from "./hooks/adminQueries";

export default function Home() {
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryQueryError,
  } = useDashboardSummary();

  const summaryError = summaryQueryError
    ? summaryQueryError instanceof Error
      ? summaryQueryError.message
      : "Could not load dashboard summary"
    : null;

  const pendingTranscodes = summary?.transcodes.pending ?? 0;
  const num = (n: number) => n.toLocaleString();

  const processing = summary?.transcodes.processing ?? 0;
  const needsTranscodeAttention = pendingTranscodes > 0;

  const stats = [
    {
      label: "Total users",
      value: summary?.users.total != null ? num(summary.users.total) : "--",
      hint: `${num(summary?.users.active ?? 0)} active`,
      hintClassName: "text-text-muted",
    },
    {
      label: "Movies",
      value: summaryLoading ? "--" : num(summary?.content.movies ?? 0),
      hint: `${num(summary?.content.published ?? 0)} published`,
      hintClassName: "text-text-muted",
    },
    {
      label: "Series",
      value: summaryLoading ? "--" : num(summary?.content.series ?? 0),
      hint: "All series",
      hintClassName: "text-text-muted",
    },
    {
      label: "Pending transcodes",
      value: summaryLoading ? "--" : num(pendingTranscodes),
      hint: needsTranscodeAttention
        ? processing > 0
          ? `${num(processing)} processing`
          : "Needs attention"
        : "Queue clear",
      hintClassName: needsTranscodeAttention ? "text-warning" : "text-success",
    },
  ];

  return (
    <AdminShell title="Dashboard" lockViewport>
      {summaryError ? (
        <div className="shrink-0">
          <AdminErrorAlert message={summaryError} />
        </div>
      ) : null}

      <div className="shrink-0">
        <AdminStatGrid>
          {stats.map((stat) => (
            <AdminStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              hintClassName={stat.hintClassName}
              compact
            />
          ))}
        </AdminStatGrid>
      </div>

      {/* Fills everything between stats and Needs attention — no dead gap */}
      <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch fit:min-h-0 fit:flex-1 fit:overflow-hidden">
        <div className="min-w-0 fit:h-full fit:min-h-0 lg:col-span-2">
          <DashboardRevenue compact />
        </div>
        <div className="min-w-0 fit:h-full fit:min-h-0">
          <DashboardTopMovies compact />
        </div>
      </div>

      <div className="shrink-0">
        <DashboardOps summary={summary} loading={summaryLoading} />
      </div>
    </AdminShell>
  );
}
