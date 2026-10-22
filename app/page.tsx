"use client";

import { AdminShell } from "./components/AdminShell";
import { AdminStatCard, AdminStatGrid } from "./components/AdminStatCard";
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
      hint: `${num(summary?.users.active ?? 0)} active accounts`,
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
          ? `${num(processing)} processing now`
          : "Needs attention"
        : "Queue clear",
      hintClassName: needsTranscodeAttention ? "text-warning" : "text-success",
      attention: needsTranscodeAttention,
    },
  ];

  return (
    <AdminShell title="Dashboard">
      {summaryError ? <AdminErrorAlert message={summaryError} /> : null}

      <AdminStatGrid>
        {stats.map((stat) => (
          <AdminStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            hintClassName={stat.hintClassName}
            attention={stat.attention}
          />
        ))}
      </AdminStatGrid>

      <div className="grid w-full gap-6">
        <DashboardRevenue />
        <DashboardTopMovies />
      </div>
    </AdminShell>
  );
}
