"use client";

import { AdminShell } from "./components/AdminShell";
import { AdminStatCard, AdminStatGrid } from "./components/AdminStatCard";
import { AdminErrorAlert } from "./components/AdminErrorAlert";
import { DashboardRevenue } from "./components/DashboardRevenue";
import { DashboardTopMovies } from "./components/DashboardTopMovies";
import { useMovieCatalog } from "./hooks/useMovieCatalog";
import { useDashboardSummary } from "./hooks/adminQueries";

export default function Home() {
  const { movies, isLoading: moviesLoading } = useMovieCatalog();
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

  const movieCount = movies.filter((m) => m.type === "Movie").length;
  const seriesCount = movies.filter((m) => m.type === "Series").length;
  const pendingTranscodes = movies.filter(
    (m) => m.transcodeStatus === "pending" || m.transcodeStatus === "processing",
  ).length;

  const stats = [
    {
      label: "Total users",
      value: summary?.users.total != null ? String(summary.users.total) : "--",
      hint: `${summary?.users.active ?? 0} active accounts`,
      hintClassName: "text-text-muted",
    },
    {
      label: "Movies",
      value: summaryLoading && moviesLoading ? "--" : String(summary?.content.movies ?? movieCount),
      hint: `${summary?.content.published ?? movies.filter((m) => m.status === "Published").length} published`,
      hintClassName: "text-text-muted",
    },
    {
      label: "Series",
      value: summaryLoading && moviesLoading ? "--" : String(summary?.content.series ?? seriesCount),
      hint: "All series",
      hintClassName: "text-text-muted",
    },
    {
      label: "Pending transcodes",
      value:
        summaryLoading && moviesLoading
          ? "--"
          : String(summary?.transcodes.pending ?? pendingTranscodes),
      hint:
        (summary?.transcodes.processing ?? 0) > 0 ? "Processing now" : "Queue clear",
      hintClassName:
        (summary?.transcodes.pending ?? pendingTranscodes) > 0 ? "text-warning" : "text-success",
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
