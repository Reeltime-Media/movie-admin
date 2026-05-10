import { AdminCard } from "./components/AdminCard";
import { AdminShell } from "./components/AdminShell";
import {
  catalog,
  moderationQueue,
  revenueMix,
  stats,
  statusClasses,
  users,
} from "./lib/adminData";

export default function Home() {
  return (
    <AdminShell>
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

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-surface-elevated">
        <div
          className="p-6 md:p-8"
          style={{
            background:
              "linear-gradient(120deg, rgba(229,9,20,0.22), rgba(31,31,31,0.96) 42%, rgba(8,8,8,1))",
          }}
        >
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
              Featured campaign
            </div>
            <h2 className="mt-2 text-[30px] font-extrabold tracking-[-0.04em] md:text-[38px]">
              Promote The Last Drive across rentals this week.
            </h2>
            <p className="mt-3 max-w-[62ch] text-[13px] leading-relaxed text-text-muted">
              The client highlights this title as a staff pick. Keep pricing, poster placement, and
              purchase callouts aligned from the admin console.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover">
                Schedule promo
              </button>
              <button className="rounded-md border border-border bg-bg/60 px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text">
                Preview client card
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
        <AdminCard title="Catalog management" action="View all" actionHref="/catalog">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                  <th className="px-5 pb-3 font-bold">Title</th>
                  <th className="px-5 pb-3 font-bold">Type</th>
                  <th className="px-5 pb-3 font-bold">Price</th>
                  <th className="px-5 pb-3 font-bold">Views</th>
                  <th className="px-5 pb-3 font-bold">Rating</th>
                  <th className="px-5 pb-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {catalog.map((item) => (
                  <tr key={item.title} className="text-[13px]">
                    <td className="px-5 py-4 font-bold">{item.title}</td>
                    <td className="px-5 py-4 text-text-muted">{item.type}</td>
                    <td className="px-5 py-4 text-text-muted">{item.price}</td>
                    <td className="px-5 py-4 text-text-muted">{item.views}</td>
                    <td className="px-5 py-4 text-text-muted">{item.rating}</td>
                    <td className="px-5 py-4">
                      <span className={statusClasses(item.status)}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard title="Publishing queue" action="Open queue">
          <div className="space-y-3">
            {moderationQueue.map((item) => (
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
            ))}
          </div>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AdminCard title="Revenue mix">
          <div className="space-y-5">
            {revenueMix.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-bold">{item.label}</span>
                  <span className="text-text-muted">
                    {item.amount} · {item.share}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                  <div className={`h-full rounded-full bg-brand ${item.bar}`} />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Audience">
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.name}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg px-4 py-3"
              >
                <div>
                  <div className="text-[13px] font-bold">{user.name}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted">
                    {user.plan} · {user.library}
                  </div>
                </div>
                <div className="text-[12px] font-bold text-text-muted">{user.spend}</div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Quick controls">
          <div className="space-y-3">
            {[
              "Update rental pricing",
              "Review uploaded posters",
              "Publish weekly series episode",
              "Send subscriber campaign",
            ].map((action) => (
              <button
                key={action}
                className="flex w-full items-center justify-between rounded-md border border-border bg-bg px-4 py-3 text-left text-[13px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                {action}
                <span className="text-brand">Open</span>
              </button>
            ))}
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
