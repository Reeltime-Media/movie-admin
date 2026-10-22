"use client";

import { AdminShell } from "./components/AdminShell";
import { AdminStatCard } from "./components/AdminStatCard";
import { AdminErrorAlert } from "./components/AdminErrorAlert";
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
      attention: false,
    },
    {
      label: "Movies",
      value: summaryLoading ? "--" : num(summary?.content.movies ?? 0),
      hint: `${num(summary?.content.published ?? 0)} published`,
      hintClassName: "text-text-muted",
      attention: false,
    },
    {
      label: "Series",
      value: summaryLoading ? "--" : num(summary?.content.series ?? 0),
      hint: "All series",
      hintClassName: "text-text-muted",
      attention: false,
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
      attention: needsTranscodeAttention,
    },
  ];

  return (
    <AdminShell title="Dashboard" lockViewport>
      {summaryError ? (
        <div className="shrink-0">
          <AdminErrorAlert message={summaryError} />
        </div>
      ) : null}

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <AdminStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            hintClassName={stat.hintClassName}
            attention={stat.attention}
            compact
          />
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-5">
        <div className="min-h-0 overflow-hidden lg:col-span-3">
          <DashboardRevenue compact />
        </div>
        <div className="min-h-0 overflow-hidden lg:col-span-2">
          <DashboardTopMovies compact />
        </div>
      </div>
    </AdminShell>
  );
}
