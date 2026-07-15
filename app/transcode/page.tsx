"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminErrorAlert } from "../components/AdminErrorAlert";
import { AdminPagination } from "../components/AdminPagination";
import { AdminTable, AdminTableHead, AdminTableWrap, AdminTh } from "../components/AdminTable";
import { InlineLoading } from "../components/InlineLoading";
import { AdminShell } from "../components/AdminShell";
import { Button } from "../components/ui/Button";
import { adminBadgeClass, adminTdClass, adminUnderlineTabClass } from "../lib/adminUi";
import { useTranscodeJobs } from "../hooks/adminQueries";
import {
  cancelTranscodeJob,
  fetchTranscodeJobsProgress,
  type TranscodeJob,
} from "../lib/api";

type StatusFilter = "all" | "queued" | "running" | "success" | "failed";

const PAGE_SIZE = 10;

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "queued", label: "Queued" },
  { key: "running", label: "Processing" },
  { key: "success", label: "Success" },
  { key: "failed", label: "Failed" },
];

function statusTone(status: string): "success" | "brand" | "danger" | "muted" {
  if (status === "success") return "success";
  if (status === "running") return "brand";
  if (status === "failed") return "danger";
  return "muted";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function seasonEpisodeLabel(job: TranscodeJob) {
  if (job.season_number == null || job.episode_number == null) return null;
  return `S${job.season_number}E${job.episode_number}`;
}

function transcodeJobLabel(job: TranscodeJob) {
  if (!job.content_title) return "Unknown title";
  if (job.content_type === "episode") {
    const parts: string[] = [];
    if (job.series_title) parts.push(job.series_title);
    const se = seasonEpisodeLabel(job);
    if (se) parts.push(se);
    parts.push(job.content_title);
    return parts.join(" · ");
  }
  return job.content_title;
}

function transcodeJobHref(job: TranscodeJob): string | null {
  if (job.content_type === "episode" && job.series_id) {
    return `/series/${job.series_id}`;
  }
  if (job.content_type === "single") {
    return `/movie/${job.content_id}`;
  }
  return null;
}

function ProgressBar({ pct, status }: { pct: number; status: string }) {
  if (status === "queued") {
    return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div className="h-full w-0 rounded-full bg-text-disabled/40" />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-danger/15">
        <div className="h-full w-full rounded-full bg-danger/60" />
      </div>
    );
  }
  if (status === "success") {
    return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-success/15">
        <div className="h-full w-full rounded-full bg-success" />
      </div>
    );
  }
  const indeterminate = pct === 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-brand/15">
        {indeterminate ? (
          <div className="absolute inset-y-0 w-2/5 animate-[slide_1.4s_ease-in-out_infinite] rounded-full bg-brand" />
        ) : (
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <span className="w-7 shrink-0 text-right text-2xs tabular-nums font-semibold text-brand">
        {indeterminate ? "…" : `${pct}%`}
      </span>
    </div>
  );
}

const EMPTY_JOBS: TranscodeJob[] = [];

export default function TranscodePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<StatusFilter>("all");

  const { jobsQuery, countsQuery, retryMutation } = useTranscodeJobs({
    page,
    pageSize: PAGE_SIZE,
    status: filter === "all" ? undefined : filter,
  });

  const jobs = jobsQuery.data?.items ?? EMPTY_JOBS;
  const pages = jobsQuery.data?.pages ?? 1;
  const total = jobsQuery.data?.total ?? 0;
  const counts = countsQuery.data ?? { all: 0, queued: 0, running: 0, success: 0, failed: 0 };
  const hasJobsData = Boolean(jobsQuery.data);
  const error = jobsQuery.error
    ? jobsQuery.error instanceof Error
      ? jobsQuery.error.message
      : "Could not load transcode jobs."
    : null;

  const reload = () => {
    void jobsQuery.refetch();
    void countsQuery.refetch();
  };

  useEffect(() => {
    const runningIds = jobs.filter((j) => j.status === "running").map((j) => j.id);
    if (runningIds.length === 0) return;

    const fetchProgress = async () => {
      try {
        const data = await fetchTranscodeJobsProgress();
        setProgressMap((prev) => ({ ...prev, ...data }));
      } catch {
        // transcoder unreachable — silently skip
      }
    };

    void fetchProgress();
    const id = setInterval(() => {
      void fetchProgress();
    }, 2000);
    return () => clearInterval(id);
  }, [jobs]);

  const handleStop = async (job: TranscodeJob) => {
    setStoppingIds((prev) => new Set(prev).add(job.id));
    try {
      await cancelTranscodeJob(job.id);
      toast.success(`Job ${shortId(job.id)} stopped`);
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["transcode"] });
      }, 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stop failed");
    } finally {
      setStoppingIds((prev) => {
        const s = new Set(prev);
        s.delete(job.id);
        return s;
      });
    }
  };

  const handleRetry = async (job: TranscodeJob) => {
    setRetryingIds((prev) => new Set(prev).add(job.id));
    try {
      await retryMutation.mutateAsync(job.id);
      toast.success(`Job ${shortId(job.id)} re-queued`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingIds((prev) => {
        const s = new Set(prev);
        s.delete(job.id);
        return s;
      });
    }
  };

  const setFilterAndResetPage = (next: StatusFilter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <AdminShell title="Transcode jobs">
      {hasJobsData && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["queued", "running", "success", "failed"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterAndResetPage(filter === key ? "all" : key)}
              className={[
                "rounded-lg border px-4 py-3 text-left transition-colors",
                filter === key
                  ? "border-brand bg-brand/10"
                  : "border-border bg-surface hover:border-border-hover",
              ].join(" ")}
            >
              <div className="text-2xs font-bold uppercase tracking-widest text-text-muted">
                {key === "running" ? "Processing" : key}
              </div>
              <div
                className={[
                  "mt-1 text-[28px] font-extrabold tabular-nums leading-none",
                  key === "success"
                    ? "text-success"
                    : key === "running"
                      ? "text-brand"
                      : key === "failed"
                        ? "text-danger"
                        : "text-text",
                ].join(" ")}
              >
                {counts[key]}
              </div>
            </button>
          ))}
        </div>
      )}

      <AdminCard title="Encoding queue" action="Refresh" actionOnClick={reload} flush>
        {hasJobsData && !error && (
          <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
            {FILTERS.map((tab) => {
              const count =
                tab.key === "all" ? counts.all : counts[tab.key as keyof typeof counts] ?? 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterAndResetPage(tab.key)}
                  className={adminUnderlineTabClass(filter === tab.key)}
                >
                  {tab.label}
                  <span className="ml-1 opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {!hasJobsData ? (
          <InlineLoading label="Loading transcode jobs" />
        ) : error ? (
          <AdminErrorAlert message={error} onRetry={reload} />
        ) : jobs.length === 0 ? (
          <AdminEmptyState
            title="No jobs"
            description={
              filter === "all"
                ? "Transcode jobs will appear here after a movie is uploaded."
                : `No ${filter} jobs.`
            }
          />
        ) : (
          <>
            <AdminTableWrap>
              <div className="-mx-5">
                <AdminTable minWidth="960px">
                  <AdminTableHead>
                    <AdminTh>Title</AdminTh>
                    <AdminTh>Job ID</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh className="w-48">Progress</AdminTh>
                    <AdminTh>Attempts</AdminTh>
                    <AdminTh>Started</AdminTh>
                    <AdminTh>Finished</AdminTh>
                    <AdminTh>Error</AdminTh>
                    <AdminTh />
                  </AdminTableHead>
                  <tbody className="divide-y divide-border">
                    {jobs.map((job) => {
                  const href = transcodeJobHref(job);
                  const label = transcodeJobLabel(job);
                  return (
                  <tr key={job.id}>
                    <td className={`${adminTdClass} max-w-xs`}>
                      {href ? (
                        <Link
                          href={href}
                          className="font-semibold text-text transition-colors hover:text-brand"
                          title={label}
                        >
                          <span className="line-clamp-2">{label}</span>
                        </Link>
                      ) : (
                        <span className="font-semibold text-text line-clamp-2" title={label}>
                          {label}
                        </span>
                      )}
                      {job.content_slug ? (
                        <span className="mt-0.5 block font-mono text-2xs text-text-muted">
                          {job.content_slug}
                        </span>
                      ) : (
                        <span
                          className="mt-0.5 block font-mono text-2xs text-text-muted"
                          title={job.content_id}
                        >
                          {shortId(job.content_id)}
                        </span>
                      )}
                    </td>
                    <td className={`${adminTdClass} font-mono text-2xs text-text-muted`} title={job.id}>
                      {shortId(job.id)}
                    </td>
                    <td className={adminTdClass}>
                      <span className={adminBadgeClass(statusTone(job.status))}>{job.status}</span>
                    </td>
                    <td className={`${adminTdClass} w-48`}>
                      <ProgressBar
                        pct={progressMap[job.id] ?? (job.status === "success" ? 100 : 0)}
                        status={job.status}
                      />
                    </td>
                    <td className={`${adminTdClass} tabular-nums text-text-muted`}>{job.attempts}</td>
                    <td className={`${adminTdClass} text-xs text-text-muted whitespace-nowrap`}>
                      {formatDate(job.started_at)}
                    </td>
                    <td className={`${adminTdClass} text-xs text-text-muted whitespace-nowrap`}>
                      {formatDate(job.finished_at)}
                    </td>
                    <td className={`${adminTdClass} max-w-xs`}>
                      {job.error ? (
                        <span className="text-2xs text-danger line-clamp-2" title={job.error}>
                          {job.error}
                        </span>
                      ) : (
                        <span className="text-text-disabled">—</span>
                      )}
                    </td>
                    <td className={`${adminTdClass} text-right`}>
                      {job.status === "running" && (
                        <Button
                          type="button"
                          variant="danger-soft"
                          size="sm"
                          disabled={stoppingIds.has(job.id)}
                          onClick={() => handleStop(job)}
                        >
                          {stoppingIds.has(job.id) ? "Stopping…" : "Stop"}
                        </Button>
                      )}
                      {job.status === "failed" && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={retryingIds.has(job.id)}
                          onClick={() => handleRetry(job)}
                        >
                          {retryingIds.has(job.id) ? "Retrying…" : "Retry"}
                        </Button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
                </AdminTable>
              </div>
            </AdminTableWrap>
            <AdminPagination
              page={page}
              pages={pages}
              total={total}
              pageSize={PAGE_SIZE}
              isLoading={jobsQuery.isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </AdminCard>
    </AdminShell>
  );
}
