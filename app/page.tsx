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

  const stats = [
    {
      label: "Total users",
      value: summary?.users.total != null ? String(summary.users.total) : "--",
      hint: `${summary?.users.active ?? 0} active accounts`,
      hintClassName: "text-text-muted",
    },
    {
      label: "Movies",
      value: summaryLoading ? "--" : String(summary?.content.movies ?? 0),
      hint: `${summary?.content.published ?? 0} published`,
      hintClassName: "text-text-muted",
    },
    {
      label: "Series",
      value: summaryLoading ? "--" : String(summary?.content.series ?? 0),
      hint: "All series",
      hintClassName: "text-text-muted",
    },
    {
      label: "Pending transcodes",
      value: summaryLoading ? "--" : String(pendingTranscodes),
      hint: (summary?.transcodes.processing ?? 0) > 0 ? "Processing now" : "Queue clear",
      hintClassName: pendingTranscodes > 0 ? "text-warning" : "text-success",
    },
  ];

  return (
    <AdminShell>
      {summaryError ? <AdminErrorAlert message={summaryError} /> : null}

      <AdminStatGrid>
        {stats.map((stat) => (
          <AdminStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            hintClassName={stat.hintClassName}
          />
        ))}
      </AdminStatGrid>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardRevenue />
        <DashboardTopMovies />
      </div>
    </AdminShell>
  );
}
