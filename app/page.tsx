"use client";

import { AdminShell } from "./components/AdminShell";
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
      delta: `${summary?.users.active ?? 0} active accounts`,
      tone: "text-text-muted",
    },
    {
      label: "Movies",
      value: summaryLoading && moviesLoading ? "--" : String(summary?.content.movies ?? movieCount),
      delta: `${summary?.content.published ?? movies.filter((m) => m.status === "Published").length} published`,
      tone: "text-text-muted",
    },
    {
      label: "Series",
      value: summaryLoading && moviesLoading ? "--" : String(summary?.content.series ?? seriesCount),
      delta: "All series",
      tone: "text-text-muted",
    },
    {
      label: "Pending transcodes",
      value: summaryLoading && moviesLoading ? "--" : String(summary?.transcodes.pending ?? pendingTranscodes),
      delta: (summary?.transcodes.processing ?? 0) > 0 ? "Processing now" : "Queue clear",
      tone: (summary?.transcodes.pending ?? pendingTranscodes) > 0 ? "text-warning" : "text-success",
    },
  ];

  return (
    <AdminShell>
      {summaryError ? (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-[12px] text-warning">
          {summaryError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-5">
            <div className="text-[12px] font-semibold text-text-muted">{stat.label}</div>
            <div className="mt-3 text-[28px] font-extrabold tracking-[-0.03em]">
              {stat.value}
            </div>
            <div className={`mt-1 text-[12px] font-bold ${stat.tone}`}>{stat.delta}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <DashboardRevenue />
        <DashboardTopMovies />
      </div>
    </AdminShell>
  );
}
