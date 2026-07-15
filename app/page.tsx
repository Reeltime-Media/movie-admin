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

  const stats = [
    {
      label: "Total users",
      value: summary?.users.total != null ? num(summary.users.total) : "--",
      hint: `${num(summary?.users.active ?? 0)} active accounts`,
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
