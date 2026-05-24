"use client";

import { useEffect, useState } from "react";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { AdminShell } from "./components/AdminShell";
import { DashboardMoviesPreview } from "./components/DashboardMoviesPreview";
import { DashboardRevenue } from "./components/DashboardRevenue";
import { DashboardTopMovies } from "./components/DashboardTopMovies";
import { useMovieCatalog } from "./components/MovieCatalogProvider";
import { getAdminDashboardSummary, type ApiDashboardSummary } from "./lib/api";

export default function Home() {
  const { movies, isLoading: moviesLoading } = useMovieCatalog();
  const [summary, setSummary] = useState<ApiDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getAdminDashboardSummary()
        .then((data) => {
          setSummary(data);
          setSummaryError(null);
        })
        .catch((err) => {
          setSummary(null);
          setSummaryError(err instanceof Error ? err.message : "Could not load dashboard summary");
        })
        .finally(() => setSummaryLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const movieCount = movies.filter((m) => m.type === "Movie").length;
  const seriesCount = movies.filter((m) => m.type === "Series").length;
  const pendingTranscodes = movies.filter(
    (m) => m.transcodeStatus === "pending" || m.transcodeStatus === "processing",
  ).length;

  const stats = [
    {
      label: "Total users",
      value: summaryLoading ? "--" : String(summary?.users.total ?? "—"),
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

      <div className="mt-6">
        <DashboardRevenue />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
        <DashboardMoviesPreview />

        <DashboardTopMovies />
      </div>

      <LoadingOverlay
        open={moviesLoading || summaryLoading}
        label="Loading dashboard"
      />
    </AdminShell>
  );
}
