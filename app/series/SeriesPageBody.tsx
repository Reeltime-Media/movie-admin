"use client";

import { AdminCard } from "../components/AdminCard";
import { useMovieCatalog } from "../components/MovieCatalogProvider";
import { statusClasses } from "../lib/adminData";
import { seriesStructureSummary, totalEpisodesInEntry } from "../lib/seriesHelpers";

export function SeriesPageBody() {
  const { movies, isLoading } = useMovieCatalog();
  const series = movies.filter((item) => item.type === "Series");
  const catalogEpisodeCount = series.reduce((n, s) => n + totalEpisodesInEntry(s), 0);

  const reviewQueue = series.filter((s) => s.status === "Review" || s.status === "Draft");

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
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-[13px] text-text-muted">Loading series...</p>
            ) : series.length === 0 ? (
              <p className="text-[13px] text-text-muted">No series in the catalog yet.</p>
            ) : (
              series.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-bg p-4"
                >
                  <div>
                    <div className="text-[14px] font-bold">{item.title}</div>
                    <div className="mt-1 text-[12px] text-text-muted">
                      {item.genre} · {seriesStructureSummary(item)} · {item.price}
                    </div>
                  </div>
                  <span className={statusClasses(item.status)}>{item.status}</span>
                </div>
              ))
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
                  <div className="mt-1 text-[12px] text-text-muted">{item.genre}</div>
                </div>
              ))
            )}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
