import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { catalog, statusClasses } from "../lib/adminData";

export default function CatalogPage() {
  return (
    <AdminShell title="Catalog management">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] leading-relaxed text-text-muted">
            Manage the same movies and series surfaced in the Reeltime client.
          </p>
        </div>
        <div className="flex gap-2">
          {["All", "Movies", "Series", "Drafts"].map((filter, index) => (
            <button
              key={filter}
              className={[
                "rounded-md px-3 py-2 text-[12px] font-semibold transition-colors",
                index === 0
                  ? "bg-brand text-white"
                  : "border border-border bg-surface text-text-muted hover:border-border-hover hover:text-text",
              ].join(" ")}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <AdminCard title="All titles" action="New title" actionHref="/catalog/new">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                <th className="px-5 pb-3 font-bold">Title</th>
                <th className="px-5 pb-3 font-bold">Type</th>
                <th className="px-5 pb-3 font-bold">Genre</th>
                <th className="px-5 pb-3 font-bold">Price</th>
                <th className="px-5 pb-3 font-bold">Views</th>
                <th className="px-5 pb-3 font-bold">Owner</th>
                <th className="px-5 pb-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {catalog.map((item) => (
                <tr key={item.title} className="text-[13px]">
                  <td className="px-5 py-4 font-bold">{item.title}</td>
                  <td className="px-5 py-4 text-text-muted">{item.type}</td>
                  <td className="px-5 py-4 text-text-muted">{item.genre}</td>
                  <td className="px-5 py-4 text-text-muted">{item.price}</td>
                  <td className="px-5 py-4 text-text-muted">{item.views}</td>
                  <td className="px-5 py-4 text-text-muted">{item.owner}</td>
                  <td className="px-5 py-4">
                    <span className={statusClasses(item.status)}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
