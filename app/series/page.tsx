import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { catalog, moderationQueue, statusClasses } from "../lib/adminData";

const series = catalog.filter((item) => item.type === "Series");

export default function SeriesPage() {
  return (
    <AdminShell title="Series operations">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active series", value: series.length },
          { label: "Episodes queued", value: 9 },
          { label: "Premium conversion", value: "18.6%" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-5">
            <div className="text-[12px] font-semibold text-text-muted">{stat.label}</div>
            <div className="mt-3 text-[28px] font-extrabold tracking-[-0.03em]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminCard title="Series catalog" action="Add season">
          <div className="space-y-3">
            {series.map((item) => (
              <div
                key={item.title}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-bg p-4"
              >
                <div>
                  <div className="text-[14px] font-bold">{item.title}</div>
                  <div className="mt-1 text-[12px] text-text-muted">
                    {item.genre} · {item.views} plays · {item.price}
                  </div>
                </div>
                <span className={statusClasses(item.status)}>{item.status}</span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Episode queue">
          <div className="space-y-3">
            {moderationQueue.map((item) => (
              <div key={item.title} className="rounded-md border border-border bg-bg p-4">
                <div className="text-[13px] font-bold">{item.title}</div>
                <div className="mt-1 text-[12px] text-text-muted">{item.detail}</div>
                <div className="mt-3 text-[11px] font-semibold text-warning">Due {item.due}</div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
