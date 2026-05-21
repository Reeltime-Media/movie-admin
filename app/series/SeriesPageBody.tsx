"use client";

import { ChevronDown, ChevronRight, Film, Lock, PlayCircle } from "lucide-react";
import { useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { statusClasses } from "../lib/adminData";
import { seriesStructureSummary, totalEpisodesInEntry } from "../lib/seriesHelpers";


export function SeriesPageBody() {
  const { movies, isLoading, error } = useMovieCatalog();
  const series = movies.filter((item) => item.type === "Series");
  const catalogEpisodeCount = series.reduce((n, s) => n + totalEpisodesInEntry(s), 0);
  const reviewQueue = series.filter((s) => s.status === "Review" || s.status === "Draft");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active series", value: isLoading ? "--" : series.length },
          { label: "Episodes in catalog", value: isLoading ? "--" : catalogEpisodeCount },
          { label: "Published", value: isLoading ? "--" : series.filter((s) => s.status === "Published").length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-5">
            <div className="text-[12px] font-semibold text-text-muted">{stat.label}</div>
            <div className="mt-3 text-[28px] font-extrabold tracking-[-0.03em]">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminCard title="Series catalog" action="New series" actionHref="/movie/new">
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-[13px] text-text-muted">Loading series...</p>
            ) : error ? (
              <p className="text-[13px] text-danger">{error}</p>
            ) : series.length === 0 ? (
              <p className="text-[13px] text-text-muted">No series in the catalog yet.</p>
            ) : (
              series.map((item) => {
                const isOpen = expandedIds.has(item.id);
                const hasSeasons = item.seasons.length > 0;
                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-md border border-border bg-bg"
                  >
                    {/* Header row */}
                    <button
                      type="button"
                      onClick={() => hasSeasons && toggleExpand(item.id)}
                      className={[
                        "flex w-full items-center justify-between gap-3 px-4 py-4 text-left",
                        hasSeasons ? "cursor-pointer hover:bg-surface/60" : "cursor-default",
                      ].join(" ")}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {hasSeasons ? (
                            isOpen ? (
                              <ChevronDown size={14} className="shrink-0 text-text-muted" />
                            ) : (
                              <ChevronRight size={14} className="shrink-0 text-text-muted" />
                            )
                          ) : (
                            <Film size={14} className="shrink-0 text-text-disabled" />
                          )}
                          <span className="text-[14px] font-bold">{item.title}</span>
                        </div>
                        <div className="ml-5.5 mt-1 text-[12px] text-text-muted">
                          {item.genre} · {seriesStructureSummary(item)} · {item.price}
                        </div>
                      </div>
                      <span className={statusClasses(item.status)}>{item.status}</span>
                    </button>

                    {/* Seasons + episodes */}
                    {isOpen && hasSeasons && (
                      <div className="border-t border-border">
                        {item.seasons.map((season) => (
                          <div key={season.id}>
                            <div className="border-b border-border/60 bg-surface px-4 py-2">
                              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">
                                Season {season.number} · {season.episodes.length} episode{season.episodes.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <ul className="divide-y divide-border/50">
                              {season.episodes.map((ep) => {
                                const isReady = ep.videoFileName != null;
                                return (
                                  <li
                                    key={ep.id}
                                    className="flex items-center gap-3 px-4 py-2.5"
                                  >
                                    <span className="w-5 shrink-0 text-center text-[13px] font-bold tabular-nums text-brand">
                                      {ep.number}
                                    </span>
                                    <span className="min-w-0 flex-1 text-[13px] font-medium text-text truncate">
                                      {ep.title}
                                    </span>
                                    {ep.runtime && (
                                      <span className="shrink-0 text-[11px] text-text-disabled">
                                        {ep.runtime}
                                      </span>
                                    )}
                                    <span className="shrink-0">
                                      {isReady ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                                          <PlayCircle size={12} />
                                          ready
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-disabled">
                                          <Lock size={12} />
                                          no video
                                        </span>
                                      )}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </AdminCard>

        <AdminCard title="Needs attention">
          <div className="space-y-3">
            {reviewQueue.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
                <p className="text-[13px] font-semibold text-text">All caught up</p>
                <p className="mt-1 text-[12px] text-text-muted">
                  No series are in Draft or Review status.
                </p>
              </div>
            ) : (
              reviewQueue.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-bg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[13px] font-bold">{item.title}</div>
                    <span className={statusClasses(item.status)}>{item.status}</span>
                  </div>
                  <div className="mt-1 text-[12px] text-text-muted">
                    {item.genre} · {seriesStructureSummary(item)}
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
