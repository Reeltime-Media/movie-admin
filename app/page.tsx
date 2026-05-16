"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminCard } from "./components/AdminCard";
import { AdminShell } from "./components/AdminShell";
import { DashboardMoviesPreview } from "./components/DashboardMoviesPreview";
import { useMovieCatalog } from "./components/MovieCatalogProvider";
import { getAdminDashboardSummary, listUsers, type ApiDashboardSummary, type ApiUser } from "./lib/api";
import { statusClasses } from "./lib/adminData";

export default function Home() {
  const { movies, isLoading: moviesLoading } = useMovieCatalog();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [summary, setSummary] = useState<ApiDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        listUsers()
          .then(setUsers)
          .catch(() => setUsers([]))
          .finally(() => setUsersLoading(false)),
        getAdminDashboardSummary()
          .then((data) => {
            setSummary(data);
            setSummaryError(null);
          })
          .catch((err) => {
            setSummary(null);
            setSummaryError(err instanceof Error ? err.message : "Could not load dashboard summary");
          })
          .finally(() => setSummaryLoading(false)),
      ]);
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
      value: summaryLoading && usersLoading ? "--" : String(summary?.users.total ?? users.length),
      delta: `${summary?.users.active ?? users.filter((user) => user.is_active).length} active accounts`,
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

  const moderationQueue = movies
    .filter((m) => m.status === "Review")
    .slice(0, 5)
    .map((m) => ({
      title: m.title,
      detail: `${m.type} · ${m.genre || "No genre"}`,
      owner: m.owner,
      due: "Needs review",
    }));

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

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
        <DashboardMoviesPreview />

        <AdminCard title="Publishing queue" action="Open queue" actionHref="/movie">
          <div className="space-y-3">
            {moderationQueue.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
                <p className="text-[13px] font-semibold text-text">Queue is clear</p>
                <p className="mt-1 text-[12px] text-text-muted">
                  No titles are waiting for review.
                </p>
              </div>
            ) : (
              moderationQueue.map((item) => (
                <div key={item.title} className="rounded-md border border-border bg-bg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-bold">{item.title}</div>
                      <div className="mt-1 text-[12px] text-text-muted">{item.detail}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-warning/15 px-2 py-1 text-[10px] font-bold text-warning">
                      {item.due}
                    </span>
                  </div>
                  <div className="mt-3 text-[11px] font-semibold text-text-disabled">
                    Owner: {item.owner}
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AdminCard title="Content status">
          <div className="space-y-5">
            {(["Published", "Draft", "Review", "Scheduled"] as const).map((status) => {
              const count = movies.filter((m) => m.status === status).length;
              const total = movies.length || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-bold">
                      <span className={statusClasses(status)}>{status}</span>
                    </span>
                    <span className="text-text-muted">
                      {count} title{count !== 1 ? "s" : ""} · {pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard title="Audience">
          <div className="space-y-3">
            {usersLoading ? (
              <p className="text-[13px] text-text-muted">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-[13px] text-text-muted">No users found.</p>
            ) : (
              users.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg px-4 py-3"
                >
                  <div>
                    <div className="text-[13px] font-bold">{user.full_name || "Unnamed user"}</div>
                    <div className="mt-0.5 text-[11px] text-text-muted">
                      {user.role} · {user.email}
                    </div>
                  </div>
                  <span
                    className={[
                      "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                      user.is_active ? "bg-success/15 text-success" : "bg-text-disabled/25 text-text-muted",
                    ].join(" ")}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))
            )}
          </div>
        </AdminCard>

        <AdminCard title="Quick controls">
          <div className="space-y-3">
            {[
              { label: "Upload new title", href: "/movie/new" },
              { label: "Update pricing", href: "/payments" },
              { label: "Review publishing queue", href: "/movie" },
              { label: "Open reports", href: "/reports" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex w-full items-center justify-between rounded-md border border-border bg-bg px-4 py-3 text-left text-[13px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                {action.label}
                <span className="text-brand">Open</span>
              </Link>
            ))}
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
